import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'
import { scoreTarget, getImagingWindow, getTransitTime } from '../../src/targetEngine.js'

async function handler(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lat, lng, forecastScore } = req.query

  if (!lat || !lng) {
    return res.status(200).json([])
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  const fScore = parseFloat(forecastScore) || 0

  try {
    const sql = neon(process.env.DATABASE_URL)

    const entries = await sql`
      SELECT w.id, w.target_id, w.alerts_enabled,
        t.ngc_ic_id, t.common_name, t.object_type, t.ra_deg, t.dec_deg,
        t.maj_axis_arcmin, t.magnitude, t.best_imaging_type
      FROM watchlist w
      JOIN targets t ON w.target_id = t.id
      WHERE w.user_id = ${userId} AND w.alerts_enabled = true
    `

    const tonight = new Date()
    const location = { latitude, longitude, min_altitude_deg: 25 }
    const qualifying = []

    for (const entry of entries) {
      try {
        const result = scoreTarget(
          entry, location, tonight, null, []
        )
        if (!result) continue

        const forecastOk = fScore >= 70 || fScore === 0 // 0 = no forecast loaded, skip check
        if (result.score >= 70 && result.imagingWindow &&
            result.imagingWindow.duration_minutes >= 360 &&
            forecastOk) {
          qualifying.push({
            watchlistId: entry.id,
            targetId: entry.target_id,
            ngcIcId: entry.ngc_ic_id,
            commonName: entry.common_name,
            objectType: entry.object_type,
            score: result.score,
            windowMinutes: result.imagingWindow.duration_minutes,
            transitTime: result.transitTime?.toISOString()
          })
        }
      } catch {
        // Skip targets that fail scoring
      }
    }

    return res.status(200).json(qualifying)
  } catch (error) {
    console.error('Watchlist check error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
