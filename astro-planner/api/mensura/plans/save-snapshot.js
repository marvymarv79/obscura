import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'
import { scoreTarget, getFilterSequence, getImagingWindow, getTransitTime, needsHDR, getAltAz } from '../../../src/targetEngine.js'

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

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Plan ID is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Fetch plan and verify ownership
    const [plan] = await sql`SELECT * FROM plans WHERE id = ${id} AND user_id = ${userId}`
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Fetch plan targets with target data
    const planTargets = await sql`
      SELECT pt.*, t.ngc_ic_id, t.common_name, t.messier_number, t.object_type,
        t.best_imaging_type, t.ra_deg, t.dec_deg, t.maj_axis_arcmin, t.magnitude, t.preview_url
      FROM plan_targets pt
      JOIN targets t ON pt.target_id = t.id
      WHERE pt.plan_id = ${id}
      ORDER BY pt.position
    `

    const lat = parseFloat(plan.latitude)
    const lng = parseFloat(plan.longitude)
    const planDate = new Date(plan.plan_date)
    const utcOffset = plan.utc_offset_minutes || 0
    const location = { latitude: lat, longitude: lng, min_altitude_deg: 25 }

    const targetSnapshots = []

    for (const pt of planTargets) {
      if (pt.ngc_ic_id) {
        console.log('[api/save-snapshot] Target lookup matched via JOIN', { planTargetId: pt.id, ngcIcId: pt.ngc_ic_id })
      } else if (pt.target_id) {
        console.warn('[api/save-snapshot] Target lookup fallback to numeric target_id', { planTargetId: pt.id, targetId: pt.target_id })
      } else {
        console.warn('[api/save-snapshot] Target lookup complete miss — no ngc_ic_id or target_id', { planTargetId: pt.id })
      }

      const target = {
        id: pt.target_id,
        ngc_ic_id: pt.ngc_ic_id,
        common_name: pt.common_name,
        messier_number: pt.messier_number,
        object_type: pt.object_type,
        best_imaging_type: pt.best_imaging_type,
        ra_deg: pt.ra_deg,
        dec_deg: pt.dec_deg,
        maj_axis_arcmin: pt.maj_axis_arcmin,
        magnitude: pt.magnitude,
        preview_url: pt.preview_url
      }

      const ra = parseFloat(pt.ra_deg)
      const dec = parseFloat(pt.dec_deg)

      const imagingWindow = getImagingWindow(ra, dec, lat, lng, planDate, 25)
      const transit = getTransitTime(ra, lat, lng, planDate)
      const scoreResult = scoreTarget(target, location, planDate, null, [])
      const hdr = needsHDR(target)
      const filterSeq = getFilterSequence(target, imagingWindow, transit, 'mono', utcOffset)

      const snapshot = {
        targetId: pt.target_id,
        targetName: pt.common_name || pt.ngc_ic_id,
        commonName: pt.common_name,
        targetType: pt.object_type,
        ra: parseFloat(pt.ra_deg),
        dec: parseFloat(pt.dec_deg),
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
        filterSequence: (filterSeq || []).map(b => ({
          filter: b.filter,
          start: b.start,
          end: b.end,
          subs: b.estimatedSubs || 0,
          subLength: b.subLength || 300,
          totalMinutes: b.estimatedSubs ? Math.round(b.estimatedSubs * b.subLength / 60) : 0
        })),
        exposureSummary: {
          totalMinutes: (filterSeq || []).reduce((s, b) => s + (b.estimatedSubs ? Math.round(b.estimatedSubs * b.subLength / 60) : 0), 0),
          perFilter: (filterSeq || []).map(b => ({
            filter: b.filter,
            minutes: b.estimatedSubs ? Math.round(b.estimatedSubs * b.subLength / 60) : 0
          }))
        },
        needsHDR: hdr,
        altitudePoints: computeAltitudePoints(ra, dec, lat, lng, imagingWindow, utcOffset)
      }

      // Save snapshot to plan_target
      await sql`
        UPDATE plan_targets SET snapshot = ${JSON.stringify(snapshot)}
        WHERE id = ${pt.id}
      `

      targetSnapshots.push({ planTargetId: pt.id, ...snapshot })
    }

    // Save summary snapshot to plan
    const planSnapshot = {
      computedAt: new Date().toISOString(),
      targetCount: planTargets.length,
      targets: targetSnapshots.map(t => ({
        targetName: t.targetName,
        score: t.score,
        imagingWindow: t.imagingWindow,
        transitTime: t.transitTime
      }))
    }

    await sql`
      UPDATE plans SET snapshot = ${JSON.stringify(planSnapshot)}, updated_at = NOW()
      WHERE id = ${id}
    `

    return res.status(200).json({ planId: id, snapshot: planSnapshot, targets: targetSnapshots })
  } catch (error) {
    console.error('[api/save-snapshot] Error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
