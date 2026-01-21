import { db, imagingPlans, imagingPlanTargets } from '../../../src/db/index.js'
import { withAuth } from '../../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Plan ID is required' })
  }

  try {
    // Get the original plan
    const [originalPlan] = await db.select()
      .from(imagingPlans)
      .where(and(eq(imagingPlans.id, id), eq(imagingPlans.userId, userId)))
      .limit(1)

    if (!originalPlan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Get original targets
    const originalTargets = await db.select()
      .from(imagingPlanTargets)
      .where(eq(imagingPlanTargets.planId, id))

    // Get optional overrides from request body
    const {
      name,
      planDate,
      locationName,
      latitude,
      longitude,
      notes
    } = req.body || {}

    // Create cloned plan with new date
    const today = new Date().toISOString().split('T')[0]
    const [clonedPlan] = await db.insert(imagingPlans).values({
      userId,
      name: name || `${originalPlan.name} (Copy)`,
      planDate: planDate || today,
      locationName: locationName !== undefined ? locationName : originalPlan.locationName,
      latitude: latitude !== undefined ? latitude : originalPlan.latitude,
      longitude: longitude !== undefined ? longitude : originalPlan.longitude,
      // Clear conditions snapshot for new plan (will be filled when forecast is fetched)
      moonPhase: null,
      moonIllumination: null,
      seeing: null,
      transparency: null,
      cloudCover: null,
      temperature: null,
      notes: notes !== undefined ? notes : originalPlan.notes,
      isArchived: false
    }).returning()

    // Clone targets (without time-specific data that needs recalculation)
    if (originalTargets.length > 0) {
      const clonedTargetValues = originalTargets.map(t => ({
        planId: clonedPlan.id,
        targetId: t.targetId,
        targetName: t.targetName,
        priority: t.priority,
        // Clear scores - they'll be recalculated for the new date
        visibilityScore: null,
        gearScore: t.gearScore, // Gear score can be preserved
        setupId: t.setupId,
        defaultSetupId: t.defaultSetupId,
        transitTime: null, // Will be recalculated
        hoursAbove30: null, // Will be recalculated
        moonSeparation: null, // Will be recalculated
        notes: t.notes
      }))

      await db.insert(imagingPlanTargets).values(clonedTargetValues)
    }

    // Fetch the complete cloned plan with targets
    const clonedTargets = await db.select()
      .from(imagingPlanTargets)
      .where(eq(imagingPlanTargets.planId, clonedPlan.id))

    return res.status(201).json({
      ...clonedPlan,
      targets: clonedTargets,
      clonedFrom: id
    })

  } catch (error) {
    console.error('Clone plan error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
