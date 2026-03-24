import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { plan_id, ordered_ids } = req.body

  if (!plan_id || !Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return res.status(400).json({ error: 'plan_id and ordered_ids array are required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify plan ownership
    const [plan] = await sql`SELECT id FROM plans WHERE id = ${plan_id} AND user_id = ${userId}`
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Update positions
    for (let i = 0; i < ordered_ids.length; i++) {
      await sql`
        UPDATE plan_targets SET position = ${i}
        WHERE id = ${ordered_ids[i]} AND plan_id = ${plan_id}
      `
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Mensura plan-target reorder error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
