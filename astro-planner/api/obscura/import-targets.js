import { neon } from '@neondatabase/serverless'

// OpenNGC type codes → our object_type mapping
const TYPE_MAP = {
  'EmN': 'EN',
  'RfN': 'RN',
  'SNR': 'SNR',
  'PN': 'PN',
  'G': 'Galaxy',
  'GGroup': 'GGroup',
  'GPair': 'GGroup',
  'GTrpl': 'GGroup',
  'GCl': 'GCl',
  'OCl': 'OCl',
  'Cl+N': 'OCl',
  'HII': 'EN',
  '*Ass': null,
  'Neb': 'RN'
}

// Best imaging type by our object_type
const IMAGING_TYPE_MAP = {
  'EN': 'narrowband',
  'RN': 'broadband',
  'SNR': 'narrowband',
  'PN': 'narrowband',
  'Galaxy': 'lrgb',
  'GGroup': 'lrgb',
  'GCl': 'broadband',
  'OCl': 'broadband'
}

// Nebula types that skip magnitude filter
const NEBULA_TYPES = new Set(['EN', 'RN', 'SNR', 'PN'])

function parseRA(raStr) {
  // Format: HH:MM:SS.ss → degrees
  if (!raStr || !raStr.trim()) return null
  const parts = raStr.trim().split(':')
  if (parts.length !== 3) return null
  const h = parseFloat(parts[0])
  const m = parseFloat(parts[1])
  const s = parseFloat(parts[2])
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null
  return (h + m / 60 + s / 3600) * 15 // hours to degrees
}

function parseDec(decStr) {
  // Format: ±DD:MM:SS.s → degrees
  if (!decStr || !decStr.trim()) return null
  const str = decStr.trim()
  const sign = str.startsWith('-') ? -1 : 1
  const abs = str.replace(/^[+-]/, '')
  const parts = abs.split(':')
  if (parts.length !== 3) return null
  const d = parseFloat(parts[0])
  const m = parseFloat(parts[1])
  const s = parseFloat(parts[2])
  if (isNaN(d) || isNaN(m) || isNaN(s)) return null
  return sign * (d + m / 60 + s / 3600)
}

function parseCSVLine(line) {
  return line.split(';')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const setupKey = req.headers['x-setup-key']
  if (!setupKey || setupKey !== process.env.DB_SETUP_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Download OpenNGC catalog
    const csvUrl = 'https://github.com/mattiaverga/OpenNGC/raw/master/database_files/NGC.csv'
    const response = await fetch(csvUrl)
    if (!response.ok) {
      return res.status(502).json({ error: `Failed to download catalog: ${response.status}` })
    }
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return res.status(500).json({ error: 'Empty or invalid CSV' })
    }

    // Parse header
    const headers = parseCSVLine(lines[0])
    const colIndex = {}
    headers.forEach((h, i) => { colIndex[h.trim()] = i })

    const nameIdx = colIndex['Name']
    const typeIdx = colIndex['Type']
    const raIdx = colIndex['RA']
    const decIdx = colIndex['Dec']
    const majAxIdx = colIndex['MajAx']
    const minAxIdx = colIndex['MinAx']
    const vMagIdx = colIndex['V-Mag']
    const bMagIdx = colIndex['B-Mag']
    const surfBrIdx = colIndex['SurfBr']
    const commonIdx = colIndex['Common names']

    const sql = neon(process.env.DATABASE_URL)

    let imported = 0
    let skipped = 0
    let total = 0

    // Process in batches
    const batch = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.length < headers.length) continue

      total++
      const rawType = cols[typeIdx]?.trim()
      const objectType = TYPE_MAP[rawType]

      // Skip types we don't want
      if (!objectType) { skipped++; continue }

      const raDeg = parseRA(cols[raIdx])
      const decDeg = parseDec(cols[decIdx])
      if (raDeg === null || decDeg === null) { skipped++; continue }

      // Declination filter: -60 to +85
      if (decDeg < -60 || decDeg > 85) { skipped++; continue }

      const name = cols[nameIdx]?.trim()
      if (!name) { skipped++; continue }

      // Format NGC/IC ID: "IC0001" → "IC1", "NGC0224" → "NGC224"
      const ngcIcId = name.replace(/^(NGC|IC)0*/, '$1')

      const majAx = cols[majAxIdx]?.trim() ? parseFloat(cols[majAxIdx]) : null
      const minAx = cols[minAxIdx]?.trim() ? parseFloat(cols[minAxIdx]) : null
      const vMag = cols[vMagIdx]?.trim() ? parseFloat(cols[vMagIdx]) : null
      const bMag = cols[bMagIdx]?.trim() ? parseFloat(cols[bMagIdx]) : null
      const surfBr = cols[surfBrIdx]?.trim() ? parseFloat(cols[surfBrIdx]) : null
      const commonName = cols[commonIdx]?.trim() || null

      // Use V-Mag if available, fall back to B-Mag
      const magnitude = (vMag !== null && !isNaN(vMag)) ? vMag
        : (bMag !== null && !isNaN(bMag)) ? bMag
        : null

      // Magnitude filter: nebulae skip, others ≤ 14
      const isNebula = NEBULA_TYPES.has(objectType)
      if (!isNebula && magnitude !== null && magnitude > 14) { skipped++; continue }

      // Surface brightness filter: ≤ 23 (null passes)
      if (surfBr !== null && !isNaN(surfBr) && surfBr > 23) { skipped++; continue }

      const bestImagingType = IMAGING_TYPE_MAP[objectType] || null

      batch.push({
        ngcIcId,
        commonName,
        objectType,
        raDeg,
        decDeg,
        majAx: (majAx !== null && !isNaN(majAx)) ? majAx : null,
        minAx: (minAx !== null && !isNaN(minAx)) ? minAx : null,
        magnitude: (magnitude !== null && !isNaN(magnitude)) ? magnitude : null,
        surfBr: (surfBr !== null && !isNaN(surfBr)) ? surfBr : null,
        bestImagingType
      })
    }

    // Insert in batches of 50
    for (let b = 0; b < batch.length; b += 50) {
      const chunk = batch.slice(b, b + 50)
      for (const obj of chunk) {
        try {
          await sql`
            INSERT INTO targets (
              ngc_ic_id, common_name, object_type,
              ra_deg, dec_deg, maj_axis_arcmin, min_axis_arcmin,
              magnitude, surface_brightness, best_imaging_type
            ) VALUES (
              ${obj.ngcIcId}, ${obj.commonName}, ${obj.objectType},
              ${obj.raDeg}, ${obj.decDeg}, ${obj.majAx}, ${obj.minAx},
              ${obj.magnitude}, ${obj.surfBr}, ${obj.bestImagingType}
            )
            ON CONFLICT (ngc_ic_id) DO NOTHING
          `
          imported++
        } catch (err) {
          skipped++
        }
      }
    }

    return res.status(200).json({
      success: true,
      imported,
      skipped,
      total,
      message: `Imported ${imported} targets, skipped ${skipped} out of ${total} total rows`
    })
  } catch (error) {
    console.error('Target import error:', error)
    return res.status(500).json({ error: error.message })
  }
}
