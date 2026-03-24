// Target scoring and recommendation engine for Obscura
// All angles in degrees unless noted. All times UTC unless noted.

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

// ─── Astronomical Calculations ───────────────────────────

/**
 * Returns local sidereal time in degrees for a given longitude and date/time.
 */
export function getSiderealTime(longitude, date) {
  const d = new Date(date)
  // Julian date
  const JD = d.getTime() / 86400000 + 2440587.5
  const T = (JD - 2451545.0) / 36525.0
  // Greenwich Mean Sidereal Time in degrees
  let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0)
    + 0.000387933 * T * T - (T * T * T) / 38710000.0
  GMST = ((GMST % 360) + 360) % 360
  // Local sidereal time
  let LST = GMST + longitude
  LST = ((LST % 360) + 360) % 360
  return LST
}

/**
 * Returns { altitude, azimuth } for a target at a given location and time.
 */
export function getAltAz(raDeg, decDeg, lat, lng, date) {
  const LST = getSiderealTime(lng, date)
  let HA = LST - raDeg
  HA = ((HA % 360) + 360) % 360
  if (HA > 180) HA -= 360

  const sinAlt = Math.sin(decDeg * DEG) * Math.sin(lat * DEG)
    + Math.cos(decDeg * DEG) * Math.cos(lat * DEG) * Math.cos(HA * DEG)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD

  const cosAz = (Math.sin(decDeg * DEG) - Math.sin(altitude * DEG) * Math.sin(lat * DEG))
    / (Math.cos(altitude * DEG) * Math.cos(lat * DEG))
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD
  if (Math.sin(HA * DEG) > 0) azimuth = 360 - azimuth

  return { altitude, azimuth }
}

/**
 * Returns the UTC DateTime when the target transits (crosses the meridian) on the given date.
 */
export function getTransitTime(raDeg, lat, lng, date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)

  // Find the time when LST = RA by scanning
  // LST at midnight
  const lst0 = getSiderealTime(lng, d)
  // How many degrees until RA
  let diff = raDeg - lst0
  diff = ((diff % 360) + 360) % 360
  // Convert degrees to hours (360° per sidereal day ≈ 23h56m)
  const hoursUntilTransit = diff / 360 * 23.9344696
  const transitMs = d.getTime() + hoursUntilTransit * 3600000
  return new Date(transitMs)
}

/**
 * Returns astronomical twilight times (sun at -18°) for a given date and location.
 * Returns { duskEnd, dawnStart } — the period of astronomical darkness.
 */
function getAstronomicalDarkness(lat, lng, date) {
  const d = new Date(date)
  d.setUTCHours(12, 0, 0, 0) // noon UTC

  // Solar position approximation
  const JD = d.getTime() / 86400000 + 2440587.5
  const n = JD - 2451545.0
  const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360
  const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360
  const lambda = L + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG)
  const epsilon = 23.439 - 0.0000004 * n
  const sunRA = Math.atan2(Math.cos(epsilon * DEG) * Math.sin(lambda * DEG), Math.cos(lambda * DEG)) * RAD
  const sunDec = Math.asin(Math.sin(epsilon * DEG) * Math.sin(lambda * DEG)) * RAD

  // Hour angle when sun is at -18°
  const cosH = (Math.sin(-18 * DEG) - Math.sin(lat * DEG) * Math.sin(sunDec * DEG))
    / (Math.cos(lat * DEG) * Math.cos(sunDec * DEG))

  if (cosH > 1) return null  // Sun never gets to -18° (polar summer)
  if (cosH < -1) {
    // Always dark — return full night
    const evening = new Date(d)
    evening.setUTCHours(18, 0, 0, 0)
    const morning = new Date(d)
    morning.setUTCDate(morning.getUTCDate() + 1)
    morning.setUTCHours(6, 0, 0, 0)
    return { duskEnd: evening, dawnStart: morning }
  }

  const H = Math.acos(cosH) * RAD // in degrees
  const hoursFromNoon = H / 15 // convert to hours

  // Solar transit time
  const solarNoonLST = ((sunRA - getSiderealTime(lng, d)) % 360 + 360) % 360
  const solarNoonHours = solarNoonLST / 360 * 23.9344696
  const solarNoonMs = d.getTime() + solarNoonHours * 3600000

  // Simple approach: solar noon ± hour angle
  // But we need to find the actual solar noon for this date
  // Use equation of time approximation
  const B = (360 / 365) * (n - 81) * DEG
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B) // minutes
  const solarNoonUTC = 12 - lng / 15 - EoT / 60 // hours UTC

  const noonMs = new Date(d).setUTCHours(0, 0, 0, 0) + solarNoonUTC * 3600000
  const duskEnd = new Date(noonMs + hoursFromNoon * 3600000)
  const dawnStart = new Date(noonMs + (24 - hoursFromNoon) * 3600000)

  // If dawnStart is before duskEnd, add a day
  if (dawnStart <= duskEnd) {
    dawnStart.setTime(dawnStart.getTime() + 86400000)
  }

  return { duskEnd, dawnStart }
}

/**
 * Returns imaging window { start, end, duration_minutes } when target
 * is above minAltDeg during astronomical darkness.
 * Returns null if no valid window exists.
 */
export function getImagingWindow(raDeg, decDeg, lat, lng, date, minAltDeg) {
  const darkness = getAstronomicalDarkness(lat, lng, date)
  if (!darkness) return null

  const { duskEnd, dawnStart } = darkness
  const stepMs = 5 * 60 * 1000 // 5-minute steps

  let windowStart = null
  let windowEnd = null

  for (let t = duskEnd.getTime(); t <= dawnStart.getTime(); t += stepMs) {
    const dt = new Date(t)
    const { altitude } = getAltAz(raDeg, decDeg, lat, lng, dt)

    if (altitude >= minAltDeg) {
      if (!windowStart) windowStart = dt
      windowEnd = dt
    }
  }

  if (!windowStart || !windowEnd) return null

  const durationMinutes = Math.round((windowEnd.getTime() - windowStart.getTime()) / 60000)
  if (durationMinutes < 10) return null

  return {
    start: windowStart,
    end: windowEnd,
    duration_minutes: durationMinutes
  }
}

/**
 * Returns angular separation in degrees between two positions using haversine.
 */
export function getMoonSeparation(raDeg, decDeg, moonRaDeg, moonDecDeg) {
  const dRA = (moonRaDeg - raDeg) * DEG
  const dDec = (moonDecDeg - decDeg) * DEG
  const a = Math.sin(dDec / 2) ** 2
    + Math.cos(decDeg * DEG) * Math.cos(moonDecDeg * DEG) * Math.sin(dRA / 2) ** 2
  return 2 * Math.asin(Math.sqrt(Math.min(1, a))) * RAD
}

// ─── Scoring ─────────────────────────────────────────────

/**
 * Score a target for a given night.
 */
export function scoreTarget(target, location, date, moonData, imagingTrains) {
  const { ra_deg, dec_deg } = target
  const ra = parseFloat(ra_deg)
  const dec = parseFloat(dec_deg)
  const lat = parseFloat(location.latitude)
  const lng = parseFloat(location.longitude)
  const minAlt = location.min_altitude_deg || 25

  // Imaging window
  const imagingWindow = getImagingWindow(ra, dec, lat, lng, date, minAlt)
  if (!imagingWindow) return null

  // Transit time
  const transitTime = getTransitTime(ra, lat, lng, date)

  // Max altitude during imaging window
  let maxAltitude = 0
  const stepMs = 10 * 60 * 1000
  for (let t = imagingWindow.start.getTime(); t <= imagingWindow.end.getTime(); t += stepMs) {
    const { altitude } = getAltAz(ra, dec, lat, lng, new Date(t))
    if (altitude > maxAltitude) maxAltitude = altitude
  }

  // Altitude score (30%)
  let altScore
  if (maxAltitude >= 70) altScore = 1.0
  else if (maxAltitude >= 60) altScore = 0.85
  else if (maxAltitude >= 45) altScore = 0.70
  else if (maxAltitude >= 35) altScore = 0.55
  else altScore = 0.35

  // Moon separation & score (25%)
  let moonSep = 180
  let moonScore = 1.0
  if (moonData && moonData.ra_deg != null && moonData.dec_deg != null) {
    moonSep = getMoonSeparation(ra, dec,
      parseFloat(moonData.ra_deg), parseFloat(moonData.dec_deg))
    if (moonSep >= 90) moonScore = 1.0
    else if (moonSep >= 60) moonScore = 0.75
    else if (moonSep >= 45) moonScore = 0.50
    else if (moonSep >= 30) moonScore = 0.25
    else moonScore = 0.0

    const illum = (moonData.illumination != null) ? parseFloat(moonData.illumination) : 0
    moonScore *= (1 - illum / 100 * 0.5)
  }

  // Window score (20%)
  let windowScore
  const dur = imagingWindow.duration_minutes
  if (dur >= 240) windowScore = 1.0
  else if (dur >= 180) windowScore = 0.75
  else if (dur >= 120) windowScore = 0.50
  else if (dur >= 60) windowScore = 0.25
  else windowScore = 0.0

  // FOV match score (25%)
  let fovScore = 0.5 // default if no trains
  let bestTrainId = null
  let bestTrainName = null

  if (imagingTrains && imagingTrains.length > 0) {
    const targetSizeArcmin = parseFloat(target.maj_axis_arcmin) || 10
    let bestFov = 0

    for (const train of imagingTrains) {
      const fovW = parseFloat(train.fov_width_deg || 0) * 60 // arcminutes
      const fovH = parseFloat(train.fov_height_deg || 0) * 60
      if (fovW <= 0 || fovH <= 0) continue

      const fovMin = Math.min(fovW, fovH)
      const fillPct = targetSizeArcmin / fovMin

      // target fills 20-80% of FOV → ideal framing → 1.0
      // target fills >80% of FOV → too big, still usable → 0.85
      // target fills 10-20% of FOV → small but workable → 0.60
      // target fills <10% of FOV → too small → 0.30
      let score
      if (fillPct >= 0.20 && fillPct <= 0.80) score = 1.0
      else if (fillPct > 0.80) score = 0.85
      else if (fillPct >= 0.10) score = 0.60
      else score = 0.30

      if (score > bestFov) {
        bestFov = score
        bestTrainId = train.id
        bestTrainName = train.profile_name
      }
    }
    fovScore = bestFov || 0.5
  }

  const finalScore = Math.round(
    (altScore * 0.30 + moonScore * 0.25 + windowScore * 0.20 + fovScore * 0.25) * 100
  )

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    imagingWindow,
    transitTime,
    maxAltitude: Math.round(maxAltitude * 10) / 10,
    moonSeparation: Math.round(moonSep * 10) / 10,
    bestTrainId,
    bestTrainName,
    components: {
      altitude: Math.round(altScore * 100) / 100,
      moon: Math.round(moonScore * 100) / 100,
      window: Math.round(windowScore * 100) / 100,
      fov: Math.round(fovScore * 100) / 100
    }
  }
}

// ─── Filter Sequence ─────────────────────────────────────

/**
 * Returns ordered array of filter blocks for the night.
 */
export function getFilterSequence(target, imagingWindow, transitTime, cameraType) {
  if (!imagingWindow) return []

  const { start, end } = imagingWindow

  if (target.best_imaging_type === 'visual') return []

  if (cameraType === 'OSC') {
    return [{
      filter: 'OSC',
      start: formatTime(start),
      end: formatTime(end),
      subLength: 300,
      estimatedSubs: Math.floor((end.getTime() - start.getTime()) / 1000 / 300)
    }]
  }

  // Mono camera — divide window into filter blocks by time proportion
  const isNarrowband = target.best_imaging_type === 'narrowband'
  const totalMs = end.getTime() - start.getTime()
  const blocks = []

  // Filter sequence ordered by priority (best seeing first)
  // Sorted by distance from transit: closest to transit = first filter
  let filterPlan
  if (isNarrowband) {
    // Narrowband: L near transit, OIII next, Ha at edges, SII last
    filterPlan = [
      { filter: 'L', pct: 0.25, subLen: 300 },
      { filter: 'OIII', pct: 0.25, subLen: 300 },
      { filter: 'Ha', pct: 0.30, subLen: 300 },
      { filter: 'SII', pct: 0.20, subLen: 300 }
    ]
  } else {
    // Broadband/LRGB: L near transit, B when high, G mid, R lowest
    filterPlan = [
      { filter: 'L', pct: 0.35, subLen: 300 },
      { filter: 'B', pct: 0.20, subLen: 180 },
      { filter: 'G', pct: 0.20, subLen: 180 },
      { filter: 'R', pct: 0.25, subLen: 180 }
    ]
  }

  // Sort slots by distance from transit — closest first
  // Then assign filter blocks in priority order around transit
  const transitMs = transitTime.getTime()
  const windowStartMs = start.getTime()

  // Determine if transit is before, during, or after window
  const transitInWindow = transitMs >= windowStartMs && transitMs <= end.getTime()

  if (transitInWindow) {
    // Split: filters before transit (ascending) and after (descending)
    // Center L on transit, spread others outward
    let cursor = windowStartMs
    const preDuration = transitMs - windowStartMs
    const postDuration = end.getTime() - transitMs

    // Assign filters: L centered on transit, others spread outward
    // Pre-transit: last filters first (R at start, G, B closer to transit)
    // Post-transit: same order reversed (B, G, R)
    const preFilters = [...filterPlan].reverse() // R, G, B, L
    const postFilters = [...filterPlan].slice(1) // B, G, R (skip L)

    // L block centered on transit
    const lPlan = filterPlan[0]
    const lMs = Math.round(totalMs * lPlan.pct)
    const lStart = Math.max(windowStartMs, transitMs - lMs / 2)
    const lEnd = Math.min(end.getTime(), lStart + lMs)
    blocks.push({
      filter: lPlan.filter,
      start: formatTime(new Date(lStart)),
      end: formatTime(new Date(lEnd)),
      subLength: lPlan.subLen,
      estimatedSubs: Math.floor((lEnd - lStart) / 1000 / lPlan.subLen)
    })

    // Pre-transit blocks (before L block)
    const preMs = lStart - windowStartMs
    if (preMs > 60000) {
      const preItems = filterPlan.slice(1).reverse() // R, G, B
      let preCursor = windowStartMs
      for (let i = 0; i < preItems.length && preCursor < lStart; i++) {
        const share = preItems[i].pct / preItems.reduce((s, p) => s + p.pct, 0)
        const blockMs = Math.min(Math.round(preMs * share), lStart - preCursor)
        if (blockMs < 60000) continue
        blocks.push({
          filter: preItems[i].filter,
          start: formatTime(new Date(preCursor)),
          end: formatTime(new Date(preCursor + blockMs)),
          subLength: preItems[i].subLen,
          estimatedSubs: Math.floor(blockMs / 1000 / preItems[i].subLen)
        })
        preCursor += blockMs
      }
    }

    // Post-transit blocks (after L block)
    const postMs = end.getTime() - lEnd
    if (postMs > 60000) {
      const postItems = filterPlan.slice(1) // B, G, R
      let postCursor = lEnd
      for (let i = 0; i < postItems.length && postCursor < end.getTime(); i++) {
        const share = postItems[i].pct / postItems.reduce((s, p) => s + p.pct, 0)
        const blockMs = Math.min(Math.round(postMs * share), end.getTime() - postCursor)
        if (blockMs < 60000) continue
        blocks.push({
          filter: postItems[i].filter,
          start: formatTime(new Date(postCursor)),
          end: formatTime(new Date(postCursor + blockMs)),
          subLength: postItems[i].subLen,
          estimatedSubs: Math.floor(blockMs / 1000 / postItems[i].subLen)
        })
        postCursor += blockMs
      }
    }
  } else {
    // Transit outside window — assign proportionally in order
    let cursor = windowStartMs
    for (const plan of filterPlan) {
      const blockMs = Math.round(totalMs * plan.pct)
      if (blockMs < 60000) continue
      const blockEnd = Math.min(cursor + blockMs, end.getTime())
      blocks.push({
        filter: plan.filter,
        start: formatTime(new Date(cursor)),
        end: formatTime(new Date(blockEnd)),
        subLength: plan.subLen,
        estimatedSubs: Math.floor((blockEnd - cursor) / 1000 / plan.subLen)
      })
      cursor = blockEnd
    }
  }

  // Sort by start time
  blocks.sort((a, b) => a.start.localeCompare(b.start))

  return blocks
}

function formatTime(date) {
  const h = date.getUTCHours().toString().padStart(2, '0')
  const m = date.getUTCMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

// ─── Exposure Time ───────────────────────────────────────

/**
 * Returns recommended sub exposure in seconds.
 */
export function getSubExposure(filter, imagingTrain, targetMagnitude) {
  const baseExposures = {
    L: 300, R: 180, G: 180, B: 180,
    Ha: 300, SII: 300, OIII: 300,
    OSC: 300
  }

  let exposure = baseExposures[filter] || 300

  const pixelScale = parseFloat(imagingTrain?.arcsec_per_pixel || 0)
  if (pixelScale > 3.0) exposure *= 0.67
  else if (pixelScale < 1.0 && pixelScale > 0) exposure *= 1.5

  const mag = parseFloat(targetMagnitude)
  if (!isNaN(mag) && mag > 12) exposure *= 1.25

  // Round to nearest 30s
  exposure = Math.round(exposure / 30) * 30
  // Clamp
  exposure = Math.max(60, Math.min(600, exposure))

  return exposure
}

// ─── HDR Flag ────────────────────────────────────────────

const HDR_TARGETS = new Set([
  'NGC1976', 'NGC1982', 'NGC5194', 'NGC224',
  'NGC5128', 'NGC6618', 'NGC6720'
])

/**
 * Returns true if target benefits from HDR imaging.
 */
export function needsHDR(target) {
  if (typeof target === 'string') {
    return HDR_TARGETS.has(target)
  }
  if (HDR_TARGETS.has(target.ngc_ic_id)) return true
  if (target.object_type === 'PN') return true
  return false
}
