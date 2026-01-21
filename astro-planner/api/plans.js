import { db, imagingPlans, imagingPlanTargets } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq, desc } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        // Get all plans for user, optionally filter by archived status
        const { archived } = req.query

        let query = db.select()
          .from(imagingPlans)
          .where(eq(imagingPlans.userId, userId))
          .orderBy(desc(imagingPlans.planDate))

        const plans = await query

        // Filter by archived if specified
        const filteredPlans = archived !== undefined
          ? plans.filter(p => p.isArchived === (archived === 'true'))
          : plans

        return res.status(200).json(filteredPlans)
      }

      case 'POST': {
        const {
          name,
          planDate,
          locationName,
          latitude,
          longitude,
          moonPhase,
          moonIllumination,
          seeing,
          transparency,
          cloudCover,
          temperature,
          notes,
          targets // Array of target objects
        } = req.body

        if (!name || !planDate) {
          return res.status(400).json({ error: 'Name and plan date are required' })
        }

        // Create the plan
        const [newPlan] = await db.insert(imagingPlans).values({
          userId,
          name,
          planDate,
          locationName: locationName || null,
          latitude: latitude || null,
          longitude: longitude || null,
          moonPhase: moonPhase || null,
          moonIllumination: moonIllumination || null,
          seeing: seeing || null,
          transparency: transparency || null,
          cloudCover: cloudCover || null,
          temperature: temperature || null,
          notes: notes || null
        }).returning()

        // Insert targets if provided
        if (targets && Array.isArray(targets) && targets.length > 0) {
          const targetValues = targets.map((t, index) => ({
            planId: newPlan.id,
            targetId: t.targetId,
            targetName: t.targetName,
            priority: t.priority || index + 1,
            visibilityScore: t.visibilityScore || null,
            gearScore: t.gearScore || null,
            setupId: t.setupId || null,
            defaultSetupId: t.defaultSetupId || null,
            transitTime: t.transitTime || null,
            hoursAbove30: t.hoursAbove30 || null,
            moonSeparation: t.moonSeparation || null,
            notes: t.notes || null
          }))

          await db.insert(imagingPlanTargets).values(targetValues)
        }

        // Fetch the complete plan with targets
        const planTargets = await db.select()
          .from(imagingPlanTargets)
          .where(eq(imagingPlanTargets.planId, newPlan.id))

        return res.status(201).json({
          ...newPlan,
          targets: planTargets
        })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Plans API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
