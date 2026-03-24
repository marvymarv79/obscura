import { db, imagingPlans } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.body
    if (!id) {
      return res.status(400).json({ error: 'Missing plan id' })
    }

    // Verify ownership
    const [plan] = await db.select()
      .from(imagingPlans)
      .where(and(eq(imagingPlans.id, id), eq(imagingPlans.userId, userId)))

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Set completed_at
    const [updated] = await db.update(imagingPlans)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(eq(imagingPlans.id, id))
      .returning()

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Complete plan error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
