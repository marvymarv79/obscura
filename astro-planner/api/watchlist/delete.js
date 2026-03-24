import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { watchlistId } = req.body
  if (!watchlistId) {
    return res.status(400).json({ error: 'watchlistId is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const [deleted] = await sql`
      DELETE FROM watchlist
      WHERE id = ${watchlistId} AND user_id = ${userId}
      RETURNING id
    `

    if (!deleted) {
      return res.status(404).json({ error: 'Watchlist entry not found' })
    }

    return res.status(200).json({ deleted: true, id: deleted.id })
  } catch (error) {
    console.error('Watchlist delete error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
