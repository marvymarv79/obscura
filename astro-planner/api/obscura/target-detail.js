import { neon } from '@neondatabase/serverless'
import {
  scoreTarget,
  getFilterSequence,
  getSubExposure,
  needsHDR,
  getAltAz,
  getTransitTime,
  getImagingWindow
} from '../../src/targetEngine.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { targetId, lat, lng, date, trainId, utcOffset } = req.query

  if (!targetId || !lat || !lng) {
    return res.status(400).json({ error: 'targetId, lat, and lng are required' })
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  const targetDate = date ? new Date(date) : new Date()
  const utcOffsetMinutes = utcOffset ? parseInt(utcOffset) : Math.round(longitude / 15) * 60

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Fetch target
    const [target] = await sql`SELECT * FROM targets WHERE id = ${parseInt(targetId)}`
    if (!target) {
      return res.status(404).json({ error: 'Target not found' })
    }

    // Fetch imaging trains
    let imagingTrains = []
    try {
      imagingTrains = await sql`
        SELECT p.id, p.profile_name,
          c.sensor_type,
          (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)) AS effective_fl,
          ((c.pixel_size_um * 206.265) /
            (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
            AS arcsec_per_pixel,
          ((c.res_x * c.pixel_size_um / 1000.0) * 57.3 /
            (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
            AS fov_width_deg,
          ((c.res_y * c.pixel_size_um / 1000.0) * 57.3 /
            (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
            AS fov_height_deg
        FROM apt_imaging_profiles p
        JOIN apt_cameras c ON p.camera_id = c.id
        JOIN apt_optics o ON p.optics_id = o.id
        LEFT JOIN apt_accessories a ON p.reducer_flattener_id = a.id
      `
    } catch (e) {
      // Apertura tables may not exist
    }

    const location = { latitude, longitude, min_altitude_deg: 25 }
    const moonData = null

    // Score target
    const scoreResult = scoreTarget(target, location, targetDate, moonData, imagingTrains)
    if (!scoreResult) {
      return res.status(200).json({
        target,
        score: null,
        message: 'Target not visible on this date from this location'
      })
    }

    // Determine camera type from best train or specified train
    let selectedTrain = null
    if (trainId) {
      selectedTrain = imagingTrains.find(t => t.id === parseInt(trainId))
    } else if (scoreResult.bestTrainId) {
      selectedTrain = imagingTrains.find(t => t.id === scoreResult.bestTrainId)
    }
    const cameraType = selectedTrain?.sensor_type === 'Mono' ? 'Mono' : 'OSC'

    // Filter sequence
    const filterSequence = getFilterSequence(
      target, scoreResult.imagingWindow, scoreResult.transitTime, cameraType, utcOffsetMinutes
    )

    // Sub exposures for each filter
    const subExposures = filterSequence.map(block => ({
      ...block,
      recommendedSubExposure: getSubExposure(
        block.filter, selectedTrain, target.magnitude
      )
    }))

    // HDR check
    const hdr = needsHDR(target)

    // Rise/transit/set for next 7 days
    const weekSchedule = []
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(targetDate)
      dayDate.setDate(dayDate.getDate() + d)
      const ra = parseFloat(target.ra_deg)
      const dec = parseFloat(target.dec_deg)
      const transit = getTransitTime(ra, latitude, longitude, dayDate)
      const window = getImagingWindow(ra, dec, latitude, longitude, dayDate, 25)
      weekSchedule.push({
        date: dayDate.toISOString().split('T')[0],
        transitTime: transit.toISOString(),
        imagingWindow: window ? {
          start: window.start.toISOString(),
          end: window.end.toISOString(),
          duration_minutes: window.duration_minutes
        } : null
      })
    }

    // Altitude curve for the night (every 15 min during darkness)
    const altitudeCurve = []
    if (scoreResult.imagingWindow) {
      const ra = parseFloat(target.ra_deg)
      const dec = parseFloat(target.dec_deg)
      // Extend 1hr before/after window for context
      const curveStart = new Date(scoreResult.imagingWindow.start.getTime() - 3600000)
      const curveEnd = new Date(scoreResult.imagingWindow.end.getTime() + 3600000)
      for (let t = curveStart.getTime(); t <= curveEnd.getTime(); t += 15 * 60 * 1000) {
        const dt = new Date(t)
        const { altitude } = getAltAz(ra, dec, latitude, longitude, dt)
        altitudeCurve.push({
          time: dt.toISOString(),
          altitude: Math.round(altitude * 10) / 10
        })
      }
    }

    return res.status(200).json({
      target,
      score: scoreResult.score,
      components: scoreResult.components,
      imagingWindow: scoreResult.imagingWindow ? {
        start: scoreResult.imagingWindow.start.toISOString(),
        end: scoreResult.imagingWindow.end.toISOString(),
        duration_minutes: scoreResult.imagingWindow.duration_minutes
      } : null,
      transitTime: scoreResult.transitTime.toISOString(),
      maxAltitude: scoreResult.maxAltitude,
      moonSeparation: scoreResult.moonSeparation,
      bestTrainId: scoreResult.bestTrainId,
      bestTrainName: scoreResult.bestTrainName,
      filterSequence: subExposures,
      hdr,
      weekSchedule,
      altitudeCurve,
      cameraType,
      utcOffsetMinutes
    })
  } catch (error) {
    console.error('Target detail API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
