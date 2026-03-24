import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const entries = await sql`
        SELECT w.id, w.target_id, w.alerts_enabled, w.planned_nights, w.created_at,
          t.ngc_ic_id, t.common_name, t.object_type, t.ra_deg, t.dec_deg,
          t.maj_axis_arcmin, t.min_axis_arcmin, t.magnitude,
          t.surface_brightness, t.best_imaging_type, t.preview_url, t.messier_number
        FROM watchlist w
        JOIN targets t ON w.target_id = t.id
        WHERE w.user_id = ${userId}
        ORDER BY w.created_at DESC
      `
      return res.status(200).json(entries)
    }

    if (req.method === 'POST') {
      const { targetId, alertsEnabled = true, plannedNights = 1 } = req.body

      if (!targetId) {
        return res.status(400).json({ error: 'targetId is required' })
      }

      // Check for duplicate
      const existing = await sql`
        SELECT id FROM watchlist
        WHERE user_id = ${userId} AND target_id = ${parseInt(targetId)}
      `
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Target already in watchlist' })
      }

      const [entry] = await sql`
        INSERT INTO watchlist (user_id, target_id, alerts_enabled, planned_nights)
        VALUES (${userId}, ${parseInt(targetId)}, ${alertsEnabled}, ${plannedNights})
        RETURNING *
      `

      return res.status(201).json(entry)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Watchlist API error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
