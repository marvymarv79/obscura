import {
  getAltAz,
  getImagingWindow,
  getTransitTime,
  getMoonSeparation,
  scoreTarget,
  getFilterSequence,
  getSubExposure,
  needsHDR
} from './targetEngine.js'

let passed = 0
let failed = 0

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS: ${name}`)
    passed++
  } else {
    console.log(`  FAIL: ${name} ${detail}`)
    failed++
  }
}

// ─── Test 1: getAltAz for Orion Nebula from Midland TX ───
console.log('\n=== Test 1: getAltAz — Orion Nebula from Midland TX ===')
{
  // Orion Nebula: RA=83.82°, Dec=-5.39°
  // Midland TX: lat=32.04, lng=-102.14
  // 2024-01-15 06:00 UTC (midnight local CST, Orion near transit)
  const date = new Date('2024-01-15T06:00:00Z')
  const result = getAltAz(83.82, -5.39, 32.04, -102.14, date)

  assert('altitude is a number', typeof result.altitude === 'number')
  assert('azimuth is a number', typeof result.azimuth === 'number')
  assert(
    `altitude roughly 45-65° (got ${result.altitude.toFixed(1)}°)`,
    result.altitude >= 30 && result.altitude <= 75,
    `got ${result.altitude.toFixed(1)}°`
  )
  assert(
    'azimuth is valid (0-360)',
    result.azimuth >= 0 && result.azimuth <= 360
  )
}

// ─── Test 2: getImagingWindow ───
console.log('\n=== Test 2: getImagingWindow — Orion from Midland ===')
{
  const date = new Date('2024-01-15T00:00:00Z')
  const window = getImagingWindow(83.82, -5.39, 32.04, -102.14, date, 25)

  assert('window is not null', window !== null)
  if (window) {
    assert('has start', window.start instanceof Date)
    assert('has end', window.end instanceof Date)
    assert(
      `duration > 180 min (got ${window.duration_minutes})`,
      window.duration_minutes > 180
    )
    assert('end is after start', window.end > window.start)
  }
}

// ─── Test 3: scoreTarget with good conditions ───
console.log('\n=== Test 3: scoreTarget — good conditions ===')
{
  const target = {
    ra_deg: 83.82,
    dec_deg: -5.39,
    maj_axis_arcmin: 60,
    ngc_ic_id: 'NGC1976',
    object_type: 'EN'
  }
  const location = {
    latitude: 32.04,
    longitude: -102.14,
    min_altitude_deg: 25
  }
  const date = new Date('2024-01-15T00:00:00Z')
  const moonData = {
    ra_deg: 200, // far from target
    dec_deg: 10,
    illumination: 10
  }
  const imagingTrains = [{
    id: 1,
    profile_name: 'Evostar 72 + 533MC',
    fov_width_deg: 3.5,
    fov_height_deg: 3.5
  }]

  const result = scoreTarget(target, location, date, moonData, imagingTrains)

  assert('result is not null', result !== null)
  if (result) {
    assert(
      `score ≥ 75 (got ${result.score})`,
      result.score >= 75,
      `got ${result.score}`
    )
    assert('has imagingWindow', result.imagingWindow !== null)
    assert('has transitTime', result.transitTime instanceof Date)
    assert(
      `maxAltitude > 40 (got ${result.maxAltitude})`,
      result.maxAltitude > 40
    )
    assert(
      `moonSeparation > 90° (got ${result.moonSeparation})`,
      result.moonSeparation > 90
    )
    assert('has components', result.components !== null)
    assert('altitude component > 0', result.components.altitude > 0)
    assert('moon component > 0', result.components.moon > 0)
  }
}

// ─── Test 4: getFilterSequence for narrowband target + mono camera ───
console.log('\n=== Test 4: getFilterSequence — narrowband + mono ===')
{
  const target = { ra_deg: 83.82, dec_deg: -5.39, best_imaging_type: 'narrowband' }
  const start = new Date('2024-01-15T01:00:00Z')
  const end = new Date('2024-01-15T10:00:00Z')
  const imagingWindow = { start, end, duration_minutes: 540 }
  const transitTime = new Date('2024-01-15T05:30:00Z')

  const blocks = getFilterSequence(target, imagingWindow, transitTime, 'Mono')

  assert('returns array', Array.isArray(blocks))
  assert(
    `at least 3 filter blocks (got ${blocks.length})`,
    blocks.length >= 3
  )

  if (blocks.length >= 3) {
    const filters = blocks.map(b => b.filter)

    // Narrowband should NOT have L
    assert('no L filter in narrowband', !filters.includes('L'))

    // Should have Ha, OIII, SII in that order
    assert('has Ha', filters.includes('Ha'))
    assert('has OIII', filters.includes('OIII'))
    assert('has SII', filters.includes('SII'))
    assert('order is Ha → OIII → SII',
      filters[0] === 'Ha' && filters[1] === 'OIII' && filters[2] === 'SII')

    // All blocks must have positive duration and subs
    const allValid = blocks.every(b =>
      b.filter && b.start && b.end && b.subLength > 0 && b.estimatedSubs > 0
    )
    assert('all blocks have required fields and subs > 0', allValid)
  }
}

// ─── Test 4a: getFilterSequence for broadband target + mono camera ───
console.log('\n=== Test 4a: getFilterSequence — broadband + mono ===')
{
  const target = { ra_deg: 83.82, dec_deg: -5.39, best_imaging_type: 'lrgb' }
  const start = new Date('2024-01-15T01:00:00Z')
  const end = new Date('2024-01-15T10:00:00Z')
  const imagingWindow = { start, end, duration_minutes: 540 }
  const transitTime = new Date('2024-01-15T05:30:00Z')

  const blocks = getFilterSequence(target, imagingWindow, transitTime, 'Mono')
  const filters = blocks.map(b => b.filter)

  assert('broadband returns array', Array.isArray(blocks))
  assert(`broadband has ≥3 blocks (got ${blocks.length})`, blocks.length >= 3)
  assert('broadband has L', filters.includes('L'))
  assert('broadband has R', filters.includes('R'))
  assert('broadband has B', filters.includes('B'))
  assert('broadband has G', filters.includes('G'))
  // Should NOT have narrowband filters
  const hasNB = filters.some(f => ['Ha', 'SII', 'OIII'].includes(f))
  assert('broadband has no NB filters', !hasNB)

  // L should be the FIRST block (starts at window start, covers transit)
  const lBlock = blocks.find(b => b.filter === 'L')
  const rBlock = blocks.find(b => b.filter === 'R')
  if (lBlock && rBlock) {
    assert(`L is first block (starts at ${blocks[0]?.filter})`, blocks[0]?.filter === 'L')
    assert(`R is last block (ends at ${blocks[blocks.length - 1]?.filter})`, blocks[blocks.length - 1]?.filter === 'R')
    // Transit (05:30) must fall within L block
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const transitMin = 5 * 60 + 30
    const lStart = toMin(lBlock.start)
    const lEnd = toMin(lBlock.end)
    const lContainsTransit = lStart <= transitMin && lEnd >= transitMin
    assert(`L block contains transit time (L=${lBlock.start}-${lBlock.end}, transit=05:30)`, lContainsTransit)
    // B should follow L
    const bIdx = blocks.findIndex(b => b.filter === 'B')
    const lIdx = blocks.findIndex(b => b.filter === 'L')
    assert(`B follows L (L idx=${lIdx}, B idx=${bIdx})`, bIdx === lIdx + 1)
  }
}

// ─── Test 4b: getFilterSequence for OSC camera ───
console.log('\n=== Test 4b: getFilterSequence — OSC camera ===')
{
  const target = { ra_deg: 83.82, dec_deg: -5.39 }
  const start = new Date('2024-01-15T01:00:00Z')
  const end = new Date('2024-01-15T10:00:00Z')
  const imagingWindow = { start, end, duration_minutes: 540 }
  const transitTime = new Date('2024-01-15T05:30:00Z')

  const blocks = getFilterSequence(target, imagingWindow, transitTime, 'OSC')

  assert('OSC returns single block', blocks.length === 1)
  assert('filter is OSC', blocks[0]?.filter === 'OSC')
  assert('subLength is 300', blocks[0]?.subLength === 300)
}

// ─── Test 5: needsHDR ───
console.log('\n=== Test 5: needsHDR ===')
{
  assert('NGC1976 (Orion) needs HDR', needsHDR('NGC1976') === true)
  assert('NGC1952 (Crab) does not need HDR', needsHDR('NGC1952') === false)
  assert('PN type needs HDR', needsHDR({ ngc_ic_id: 'NGC9999', object_type: 'PN' }) === true)
  assert('Galaxy does not need HDR', needsHDR({ ngc_ic_id: 'NGC9999', object_type: 'Galaxy' }) === false)
}

// ─── Test 6: getSubExposure ───
console.log('\n=== Test 6: getSubExposure ===')
{
  const train = { arcsec_per_pixel: 2.0 }
  assert('L base = 300s', getSubExposure('L', train, 10) === 300)
  assert('R base = 180s', getSubExposure('R', train, 10) === 180)
  assert('Ha base = 300s', getSubExposure('Ha', train, 10) === 300)

  // Wide field adjustment
  const wideTrain = { arcsec_per_pixel: 4.0 }
  const wideL = getSubExposure('L', wideTrain, 10)
  assert(`wide field L < 300 (got ${wideL})`, wideL < 300)

  // Faint target adjustment
  const faintL = getSubExposure('L', train, 13)
  assert(`faint target L > 300 (got ${faintL})`, faintL > 300)
}

// ─── Test 7: getMoonSeparation ───
console.log('\n=== Test 7: getMoonSeparation ===')
{
  // Same position → 0°
  const sep0 = getMoonSeparation(100, 20, 100, 20)
  assert(`same position = 0° (got ${sep0.toFixed(1)})`, sep0 < 0.1)

  // Opposite positions → ~180°
  const sep180 = getMoonSeparation(0, 0, 180, 0)
  assert(`opposite = ~180° (got ${sep180.toFixed(1)})`, sep180 > 170)

  // 90° separation
  const sep90 = getMoonSeparation(0, 0, 90, 0)
  assert(`90° apart (got ${sep90.toFixed(1)})`, Math.abs(sep90 - 90) < 5)
}

// ─── Summary ───
console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('SOME TESTS FAILED')
  process.exit(1)
} else {
  console.log('ALL TESTS PASSED')
}
