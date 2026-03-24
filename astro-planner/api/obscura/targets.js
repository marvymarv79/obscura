import { neon } from '@neondatabase/serverless'
import {
  scoreTarget,
  getImagingWindow,
  getTransitTime,
  getMoonSeparation,
  getAltAz
} from '../../src/targetEngine.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lat, lng, date, minAlt, type, minScore } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' })
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  const minAltDeg = parseInt(minAlt) || 25
  const minScoreVal = parseInt(minScore) || 40
  const targetDate = date ? new Date(date) : new Date()

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Fetch all targets
    let targets = await sql`SELECT * FROM targets ORDER BY ngc_ic_id`

    // Filter by imaging type if specified
    if (type && type !== 'all') {
      targets = targets.filter(t => t.best_imaging_type === type)
    }

    // Fetch imaging trains for FOV scoring
    let imagingTrains = []
    try {
      imagingTrains = await sql`
        SELECT p.id, p.profile_name,
          (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)) AS effective_fl,
          ((c.pixel_size_um * 206.265) /
            (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
            AS arcsec_per_pixel,
          ((c.res_x * c.pixel_size_um / 1000.0) * 57.3 /
            (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
            AS fov_width_deg,
          ((c.res_y * c.pixel_size_um / 1000.0) * 57.3 /
            (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
            AS fov_height_deg,
          c.sensor_type
        FROM apt_imaging_profiles p
        JOIN apt_cameras c ON p.camera_id = c.id
        JOIN apt_optics o ON p.optics_id = o.id
        LEFT JOIN apt_accessories a ON p.reducer_flattener_id = a.id
      `
    } catch (e) {
      // Apertura tables may not exist — continue without FOV scoring
    }

    const location = { latitude, longitude, min_altitude_deg: minAltDeg }

    // Simple moon data — use current date approximation
    // In production this would come from GetSky_V1
    const moonData = null // Will be enhanced when moon API is wired

    // Score all targets
    const scored = []
    for (const target of targets) {
      try {
        const result = scoreTarget(target, location, targetDate, moonData, imagingTrains)
        if (result && result.score >= minScoreVal) {
          scored.push({
            ...target,
            ...result
          })
        }
      } catch (e) {
        // Skip targets that fail scoring
      }
    }

    // Sort by score descending, return top 20
    scored.sort((a, b) => b.score - a.score)
    const top20 = scored.slice(0, 20)

    return res.status(200).json(top20)
  } catch (error) {
    console.error('Targets API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
