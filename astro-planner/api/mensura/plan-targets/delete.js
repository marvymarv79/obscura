import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Plan target ID is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify ownership through plan
    const [pt] = await sql`
      SELECT pt.id FROM plan_targets pt
      JOIN plans p ON pt.plan_id = p.id
      WHERE pt.id = ${id} AND p.user_id = ${userId}
    `
    if (!pt) {
      return res.status(404).json({ error: 'Plan target not found' })
    }

    await sql`DELETE FROM plan_targets WHERE id = ${id}`

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Mensura plan-target delete error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
