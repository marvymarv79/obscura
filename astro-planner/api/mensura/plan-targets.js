import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'
import { scoreTarget, getFilterSequence, getImagingWindow, getTransitTime, needsHDR } from '../../src/targetEngine.js'

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

  const { plan_id, target_id, imaging_train_id, window_start, window_end } = req.body

  if (!plan_id || !target_id) {
    return res.status(400).json({ error: 'plan_id and target_id are required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify plan ownership
    const [plan] = await sql`SELECT * FROM plans WHERE id = ${plan_id} AND user_id = ${userId}`
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Get current target count for position
    const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM plan_targets WHERE plan_id = ${plan_id}`

    // Fetch target data
    const [target] = await sql`SELECT * FROM targets WHERE id = ${target_id}`
    if (!target) {
      return res.status(404).json({ error: 'Target not found' })
    }

    // Compute initial snapshot
    const lat = parseFloat(plan.latitude)
    const lng = parseFloat(plan.longitude)
    const planDate = new Date(plan.plan_date)
    const utcOffset = plan.utc_offset_minutes || 0
    const location = { latitude: lat, longitude: lng, min_altitude_deg: 25 }

    const ra = parseFloat(target.ra_deg)
    const dec = parseFloat(target.dec_deg)

    const imagingWindow = getImagingWindow(ra, dec, lat, lng, planDate, 25)
    const transitTime = getTransitTime(ra, lat, lng, planDate)
    const score = scoreTarget(target, location, planDate, null, [])
    const hdr = needsHDR(target)
    const filterSeq = getFilterSequence(target, imagingWindow, transitTime, 'mono', utcOffset)

    const filterBlocks = (filterSeq || []).map(b => ({
      filter: b.filter,
      start: b.start,
      end: b.end,
      estimatedSubs: b.estimatedSubs,
      subLength: b.subLength,
      totalMinutes: b.estimatedSubs ? Math.round(b.estimatedSubs * b.subLength / 60) : 0
    }))
    const totalIntegrationMinutes = filterBlocks.reduce((s, b) => s + (b.totalMinutes || 0), 0)

    const snapshot = {
      targetName: target.common_name || target.ngc_ic_id,
      score: score ? score.score : null,
      scoreComponents: score ? score.components : null,
      imagingWindow: imagingWindow ? {
        start: formatTimeOffset(imagingWindow.start, utcOffset),
        end: formatTimeOffset(imagingWindow.end, utcOffset),
        durationMinutes: imagingWindow.duration_minutes
      } : null,
      transitTime: formatTimeOffset(transitTime, utcOffset),
      transitAltitude: score ? score.maxAltitude : null,
      moonSeparation: score ? score.moonSeparation : null,
      hdr,
      filterSequence: filterBlocks,
      totalIntegrationMinutes
    }

    const [planTarget] = await sql`
      INSERT INTO plan_targets (plan_id, target_id, position, imaging_train_id, window_start, window_end, snapshot)
      VALUES (${plan_id}, ${target_id}, ${count}, ${imaging_train_id ?? null}, ${window_start ?? null}, ${window_end ?? null}, ${JSON.stringify(snapshot)})
      RETURNING *
    `

    return res.status(201).json({ ...planTarget, snapshot })
  } catch (error) {
    console.error('[api/plan-targets] Error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
