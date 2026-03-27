import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'
import { scoreTarget, getFilterSequence, getSubExposure, getImagingWindow, getTransitTime, needsHDR, getAltAz } from '../../../src/targetEngine.js'

function formatTimeOffset(date, offsetMinutes) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  const localMs = d.getTime() + (offsetMinutes * 60 * 1000)
  const local = new Date(localMs)
  return `${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`
}

function computeAltitudePoints(raDeg, decDeg, lat, lng, imagingWindow, utcOffset) {
  if (!imagingWindow?.start || !imagingWindow?.end) return []
  const points = []
  const startMs = imagingWindow.start.getTime()
  const endMs = imagingWindow.end.getTime()
  const step = 15 * 60 * 1000 // 15-minute intervals
  for (let ms = startMs; ms <= endMs; ms += step) {
    const date = new Date(ms)
    const { altitude } = getAltAz(raDeg, decDeg, lat, lng, date)
    points.push({
      time: formatTimeOffset(date, utcOffset),
      altitude: Math.round(altitude * 10) / 10
    })
  }
  return points
}

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, window_start, window_end, imaging_train_id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Plan target ID is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Fetch plan_target and verify ownership through plan
    const [pt] = await sql`
      SELECT pt.*, p.user_id, p.latitude, p.longitude, p.plan_date, p.utc_offset_minutes
      FROM plan_targets pt
      JOIN plans p ON pt.plan_id = p.id
      WHERE pt.id = ${id} AND p.user_id = ${userId}
    `
    if (!pt) {
      return res.status(404).json({ error: 'Plan target not found' })
    }

    // Update fields
    const [updated] = await sql`
      UPDATE plan_targets
      SET window_start = COALESCE(${window_start ?? null}, window_start),
          window_end = COALESCE(${window_end ?? null}, window_end),
          imaging_train_id = COALESCE(${imaging_train_id ?? null}, imaging_train_id)
      WHERE id = ${id}
      RETURNING *
    `

    // Recompute snapshot
    const [target] = await sql`SELECT * FROM targets WHERE id = ${updated.target_id}`

    const lat = parseFloat(pt.latitude)
    const lng = parseFloat(pt.longitude)
    const planDate = new Date(pt.plan_date)
    const utcOffset = pt.utc_offset_minutes || 0
    const location = { latitude: lat, longitude: lng, min_altitude_deg: 25 }

    const ra = parseFloat(target.ra_deg)
    const dec = parseFloat(target.dec_deg)

    const imagingWindow = getImagingWindow(ra, dec, lat, lng, planDate, 25)
    const transit = getTransitTime(ra, lat, lng, planDate)
    const scoreResult = scoreTarget(target, location, planDate, null, [])
    const hdr = needsHDR(target)
    const filterSeq = getFilterSequence(target, imagingWindow, transit, 'mono', utcOffset)

    const snapshot = {
      targetId: target.id,
      targetName: target.common_name || target.ngc_ic_id,
      commonName: target.common_name,
      targetType: target.object_type,
      ra: parseFloat(target.ra_deg),
      dec: parseFloat(target.dec_deg),
      score: scoreResult?.score || 0,
      scoreBreakdown: {
        altitude: Math.round((scoreResult?.components?.altitude || 0) * 100),
        moon: Math.round((scoreResult?.components?.moon || 0) * 100),
        window: Math.round((scoreResult?.components?.window || 0) * 100),
        fovMatch: Math.round((scoreResult?.components?.fov || 0) * 100)
      },
      windowStart: formatTimeOffset(imagingWindow?.start, utcOffset),
      windowEnd: formatTimeOffset(imagingWindow?.end, utcOffset),
      transitTime: formatTimeOffset(transit, utcOffset),
      imagingWindow: imagingWindow ? {
        start: formatTimeOffset(imagingWindow.start, utcOffset),
        end: formatTimeOffset(imagingWindow.end, utcOffset),
        durationMinutes: imagingWindow.duration_minutes || 0
      } : null,
      filterSequence: (filterSeq || []).map(b => {
        const recSub = getSubExposure(b.filter, null, target.magnitude) ?? b.subLength ?? 300
        return {
          filter: b.filter,
          start: b.start,
          end: b.end,
          subs: b.estimatedSubs || 0,
          subLength: recSub,
          totalMinutes: b.estimatedSubs ? Math.round(b.estimatedSubs * recSub / 60) : 0
        }
      }),
      exposureSummary: (() => {
        const mapped = (filterSeq || []).map(b => {
          const recSub = getSubExposure(b.filter, null, target.magnitude) ?? b.subLength ?? 300
          return { filter: b.filter, minutes: b.estimatedSubs ? Math.round(b.estimatedSubs * recSub / 60) : 0 }
        })
        return { totalMinutes: mapped.reduce((s, m) => s + m.minutes, 0), perFilter: mapped }
      })(),
      needsHDR: hdr,
      altitudePoints: computeAltitudePoints(ra, dec, lat, lng, imagingWindow, utcOffset)
    }

    await sql`UPDATE plan_targets SET snapshot = ${JSON.stringify(snapshot)} WHERE id = ${id}`

    return res.status(200).json({ ...updated, snapshot })
  } catch (error) {
    console.error('Mensura plan-target update error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
