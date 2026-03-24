import { db, imagingPlans, imagingPlanTargets } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import {
  scoreTarget, getFilterSequence, getImagingWindow,
  getTransitTime, needsHDR
} from '../../src/targetEngine.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { planId, forecastScore, utcOffsetMinutes } = req.body
    if (!planId) {
      return res.status(400).json({ error: 'Missing planId' })
    }

    // Fetch plan
    const [plan] = await db.select()
      .from(imagingPlans)
      .where(and(eq(imagingPlans.id, planId), eq(imagingPlans.userId, userId)))

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Fetch plan targets
    const planTargets = await db.select()
      .from(imagingPlanTargets)
      .where(eq(imagingPlanTargets.planId, planId))

    // Fetch full target data from targets table
    // targetId in imaging_plan_targets is varchar — stores NGC/IC id strings (e.g. "NGC2632")
    // Also try numeric IDs for plans created from the Targets tab (which stores numeric DB ids)
    const sql = neon(process.env.DATABASE_URL)
    const ngcIds = planTargets.map(t => t.targetId).filter(Boolean)
    const numericIds = ngcIds.map(id => parseInt(id)).filter(id => !isNaN(id))

    let dbTargets = []
    if (ngcIds.length > 0) {
      // Try matching by ngc_ic_id first (string IDs like "NGC2632")
      dbTargets = await sql`
        SELECT id, ngc_ic_id, common_name, messier_number, object_type,
          best_imaging_type, ra_deg, dec_deg, maj_axis_arcmin, magnitude, preview_url
        FROM targets WHERE ngc_ic_id = ANY(${ngcIds})
      `
      // If no matches and we have numeric IDs, try by primary key id
      if (dbTargets.length === 0 && numericIds.length > 0) {
        dbTargets = await sql`
          SELECT id, ngc_ic_id, common_name, messier_number, object_type,
            best_imaging_type, ra_deg, dec_deg, maj_axis_arcmin, magnitude, preview_url
          FROM targets WHERE id = ANY(${numericIds})
        `
      }
    }

    // Fetch imaging profiles for train names
    let profiles = []
    try {
      profiles = await sql`SELECT id, profile_name FROM apt_imaging_profiles`
    } catch { /* no profiles available */ }

    const location = {
      lat: parseFloat(plan.latitude) || 32.04,
      lng: parseFloat(plan.longitude) || -102.14,
      min_altitude_deg: 35
    }
    const planDate = new Date(plan.planDate + 'T00:00:00Z')
    const offset = utcOffsetMinutes || -300

    const snapshotTargets = []
    for (const pt of planTargets) {
      const targetData = dbTargets.find(t =>
        t.ngc_ic_id === pt.targetId || String(t.id) === pt.targetId
      )
      if (!targetData) {
        snapshotTargets.push({
          targetId: pt.targetId,
          ngcIcId: pt.targetName || pt.targetId,
          score: 0,
          filterSequence: []
        })
        continue
      }

      try {
        const target = {
          ngc_ic_id: targetData.ngc_ic_id,
          ra_deg: parseFloat(targetData.ra_deg),
          dec_deg: parseFloat(targetData.dec_deg),
          best_imaging_type: targetData.best_imaging_type,
          magnitude: parseFloat(targetData.magnitude) || null,
          maj_axis_arcmin: parseFloat(targetData.maj_axis_arcmin) || null
        }

        const result = scoreTarget(target, location, planDate, null, [])
        const transit = getTransitTime(target.ra_deg, location.lat, location.lng, planDate)
        const window = result?.imagingWindow || null

        // Determine camera type from imaging train
        let cameraType = 'OSC'
        const trainId = pt.notes || pt.defaultSetupId
        if (trainId) {
          const profile = profiles.find(p => String(p.id) === String(trainId))
          if (profile && profile.profile_name && profile.profile_name.toLowerCase().includes('mono')) {
            cameraType = 'Mono'
          }
        }

        const filterSeq = window ? getFilterSequence(target, window, transit, cameraType, offset) : []
        const hdr = needsHDR(target)

        const totalIntegration = filterSeq.reduce((sum, b) => {
          const startParts = b.start.split(':').map(Number)
          const endParts = b.end.split(':').map(Number)
          let startMin = startParts[0] * 60 + startParts[1]
          let endMin = endParts[0] * 60 + endParts[1]
          if (endMin < startMin) endMin += 24 * 60
          return sum + (endMin - startMin)
        }, 0)

        snapshotTargets.push({
          targetId: parseInt(targetData.id),
          ngcIcId: targetData.ngc_ic_id,
          messierNumber: targetData.messier_number ? parseInt(targetData.messier_number) : null,
          commonName: targetData.common_name || null,
          objectType: targetData.object_type,
          bestImagingType: targetData.best_imaging_type,
          previewUrl: targetData.preview_url || null,
          raDeg: parseFloat(targetData.ra_deg),
          decDeg: parseFloat(targetData.dec_deg),
          majAxisArcmin: parseFloat(targetData.maj_axis_arcmin) || null,
          magnitude: parseFloat(targetData.magnitude) || null,
          imagingTrainId: trainId || null,
          imagingTrainName: trainId ? (profiles.find(p => String(p.id) === String(trainId))?.profile_name || null) : null,
          score: result?.score || 0,
          scoreComponents: result?.components || { altitude: 0, moon: 0, window: 0, fov: 0 },
          imagingWindow: window ? {
            start: window.startFormatted || formatTimeOffset(window.start, offset),
            end: window.endFormatted || formatTimeOffset(window.end, offset),
            durationMinutes: window.duration_minutes || 0
          } : null,
          transitTime: transit ? formatTimeOffset(transit, offset) : null,
          transitAltitude: result?.maxAltitude || null,
          moonSeparation: result?.moonSeparation || null,
          moonIllumination: null,
          moonPhase: null,
          hdr,
          filterSequence: filterSeq.map(b => ({
            filter: b.filter,
            start: b.start,
            end: b.end,
            subLength: b.subLength,
            estimatedSubs: b.estimatedSubs,
            totalMinutes: b.estimatedSubs ? Math.round(b.estimatedSubs * b.subLength / 60) : 0
          })),
          totalIntegrationMinutes: totalIntegration
        })
      } catch (err) {
        console.error(`Snapshot error for target ${pt.targetId}:`, err.message)
        snapshotTargets.push({
          targetId: parseInt(targetData.id),
          ngcIcId: targetData.ngc_ic_id,
          commonName: targetData.common_name,
          objectType: targetData.object_type,
          score: 0,
          filterSequence: []
        })
      }
    }

    const snapshot = {
      forecastScore: forecastScore || null,
      createdAt: new Date().toISOString(),
      utcOffsetMinutes: offset,
      targets: snapshotTargets
    }

    // Store snapshot
    const [updated] = await db.update(imagingPlans)
      .set({ planSnapshot: snapshot, updatedAt: new Date() })
      .where(eq(imagingPlans.id, planId))
      .returning()

    return res.status(200).json({ ...updated, targets: planTargets })
  } catch (error) {
    console.error('Build snapshot error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function formatTimeOffset(date, offsetMinutes) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  const localMs = d.getTime() + (offsetMinutes * 60 * 1000)
  const local = new Date(localMs)
  const h = local.getUTCHours()
  const m = local.getUTCMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
