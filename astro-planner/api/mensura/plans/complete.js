import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Plan ID is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify ownership
    const [existing] = await sql`SELECT id FROM plans WHERE id = ${id} AND user_id = ${userId}`
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    const [updated] = await sql`
      UPDATE plans
      SET status = 'complete', completed_at = NOW(), updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Mensura plan complete error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
