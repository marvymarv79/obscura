import { db, imagingPlans, imagingPlanTargets } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Plan ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        // Get plan with targets
        const [plan] = await db.select()
          .from(imagingPlans)
          .where(and(eq(imagingPlans.id, id), eq(imagingPlans.userId, userId)))
          .limit(1)

        if (!plan) {
          return res.status(404).json({ error: 'Plan not found' })
        }

        const targets = await db.select()
          .from(imagingPlanTargets)
          .where(eq(imagingPlanTargets.planId, id))
          .orderBy(imagingPlanTargets.priority)

        return res.status(200).json({
          ...plan,
          targets
        })
      }

      case 'PUT': {
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
          isArchived,
          targets
        } = req.body

        const [updated] = await db.update(imagingPlans)
          .set({
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
            isArchived,
            updatedAt: new Date()
          })
          .where(and(eq(imagingPlans.id, id), eq(imagingPlans.userId, userId)))
          .returning()

        if (!updated) {
          return res.status(404).json({ error: 'Plan not found' })
        }

        // Update targets if provided
        if (targets !== undefined) {
          // Delete existing targets
          await db.delete(imagingPlanTargets)
            .where(eq(imagingPlanTargets.planId, id))

          // Insert new targets
          if (targets && Array.isArray(targets) && targets.length > 0) {
            const targetValues = targets.map((t, index) => ({
              planId: id,
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
        }

        // Fetch updated targets
        const updatedTargets = await db.select()
          .from(imagingPlanTargets)
          .where(eq(imagingPlanTargets.planId, id))

        return res.status(200).json({
          ...updated,
          targets: updatedTargets
        })
      }

      case 'DELETE': {
        const [deleted] = await db.delete(imagingPlans)
          .where(and(eq(imagingPlans.id, id), eq(imagingPlans.userId, userId)))
          .returning()

        if (!deleted) {
          return res.status(404).json({ error: 'Plan not found' })
        }

        return res.status(200).json({ message: 'Plan deleted', id })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Plan API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
