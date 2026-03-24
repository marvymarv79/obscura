import { db, imagingPlans, imagingPlanTargets } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.body
  if (!id) {
    return res.status(400).json({ error: 'Missing plan id' })
  }

  try {
    // Delete targets first (cascade)
    await db.delete(imagingPlanTargets)
      .where(eq(imagingPlanTargets.planId, id))

    const [deleted] = await db.delete(imagingPlans)
      .where(and(eq(imagingPlans.id, id), eq(imagingPlans.userId, userId)))
      .returning()

    if (!deleted) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    return res.status(200).json({ deleted: true, id: deleted.id })
  } catch (err) {
    console.error('Delete plan error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
