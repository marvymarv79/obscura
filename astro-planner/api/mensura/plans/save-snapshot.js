import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'
import { scoreTarget, getFilterSequence, getImagingWindow, getTransitTime, needsHDR } from '../../../src/targetEngine.js'

function formatTimeOffset(date, offsetMinutes) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  const localMs = d.getTime() + (offsetMinutes * 60 * 1000)
  const local = new Date(localMs)
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`
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
      const transitTime = getTransitTime(ra, lat, lng, planDate)
      const score = scoreTarget(target, location, planDate, null, [])
      const hdr = needsHDR(target)
      const filterSeq = getFilterSequence(target, imagingWindow, transitTime, 'mono', utcOffset)

      const snapshot = {
        target_name: pt.common_name || pt.ngc_ic_id,
        score: score ? score.score : null,
        components: score ? score.components : null,
        imaging_window: imagingWindow ? {
          start: formatTimeOffset(imagingWindow.start, utcOffset),
          end: formatTimeOffset(imagingWindow.end, utcOffset),
          duration_minutes: imagingWindow.duration_minutes
        } : null,
        transit_time: formatTimeOffset(transitTime, utcOffset),
        needs_hdr: hdr,
        filter_sequence: filterSeq
      }

      // Save snapshot to plan_target
      await sql`
        UPDATE plan_targets SET snapshot = ${JSON.stringify(snapshot)}
        WHERE id = ${pt.id}
      `

      targetSnapshots.push({ plan_target_id: pt.id, ...snapshot })
    }

    // Save summary snapshot to plan
    const planSnapshot = {
      computed_at: new Date().toISOString(),
      target_count: planTargets.length,
      targets: targetSnapshots.map(t => ({
        name: t.target_name,
        score: t.score,
        window: t.imaging_window,
        transit: t.transit_time
      }))
    }

    await sql`
      UPDATE plans SET snapshot = ${JSON.stringify(planSnapshot)}, updated_at = NOW()
      WHERE id = ${id}
    `

    return res.status(200).json({ plan_id: id, snapshot: planSnapshot, targets: targetSnapshots })
  } catch (error) {
    console.error('[api/save-snapshot] Error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
