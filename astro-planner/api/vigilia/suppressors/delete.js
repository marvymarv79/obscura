import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [deleted] = await sql`
      DELETE FROM vig_suppressors
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `

    if (!deleted) {
      return res.status(404).json({ error: 'Suppressor not found' })
    }

    return res.status(200).json({ deleted: true, id: deleted.id })
  } catch (error) {
    console.error('Vigilia suppressor delete error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
