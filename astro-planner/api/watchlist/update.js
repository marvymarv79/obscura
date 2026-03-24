import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { watchlistId, alertsEnabled, plannedNights } = req.body
  if (!watchlistId) {
    return res.status(400).json({ error: 'watchlistId is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const updates = {}
    if (alertsEnabled !== undefined) updates.alerts_enabled = alertsEnabled
    if (plannedNights !== undefined) updates.planned_nights = plannedNights

    const [updated] = await sql`
      UPDATE watchlist
      SET alerts_enabled = COALESCE(${alertsEnabled ?? null}, alerts_enabled),
          planned_nights = COALESCE(${plannedNights ?? null}, planned_nights)
      WHERE id = ${watchlistId} AND user_id = ${userId}
      RETURNING *
    `

    if (!updated) {
      return res.status(404).json({ error: 'Watchlist entry not found' })
    }

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Watchlist update error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
