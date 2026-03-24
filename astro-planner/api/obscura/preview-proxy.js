import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  const { targetId, ra, dec, fov: fovParam } = req.query

  let raDeg, decDeg, fov

  if (targetId) {
    const sql = neon(process.env.DATABASE_URL)
    const [target] = await sql`
      SELECT ra_deg, dec_deg, maj_axis_arcmin FROM targets WHERE id = ${parseInt(targetId)}
    `
    if (!target) return res.status(404).end()
    raDeg = parseFloat(target.ra_deg)
    decDeg = parseFloat(target.dec_deg)
    const fovRaw = Math.max(parseFloat(target.maj_axis_arcmin) || 20, 20) / 60 * 2.5
    fov = Math.max(0.1, Math.min(10.0, fovRaw))
  } else if (ra && dec) {
    raDeg = parseFloat(ra)
    decDeg = parseFloat(dec)
    fov = parseFloat(fovParam) || 0.5
  } else {
    return res.status(400).json({ error: 'targetId or ra+dec required' })
  }

  // Convert RA degrees to hours:minutes:seconds for STScI
  const raH = raDeg / 15
  const raHr = Math.floor(raH)
  const raMin = Math.floor((raH - raHr) * 60)
  const raSec = ((raH - raHr) * 60 - raMin) * 60

  const decSign = decDeg >= 0 ? '+' : '-'
  const decAbs = Math.abs(decDeg)
  const decD = Math.floor(decAbs)
  const decMin = Math.floor((decAbs - decD) * 60)
  const decSec = ((decAbs - decD) * 60 - decMin) * 60

  const raStr = `${String(raHr).padStart(2, '0')}+${String(raMin).padStart(2, '0')}+${raSec.toFixed(1)}`
  const decStr = `${decSign}${String(decD).padStart(2, '0')}+${String(decMin).padStart(2, '0')}+${decSec.toFixed(1)}`
  const fovArcmin = Math.max(1, Math.round(fov * 60))

  const url = `https://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_red&r=${raStr}&d=${decStr}&e=J2000&h=${fovArcmin}&w=${fovArcmin}&f=gif&c=none&fov=NONE&v3=`

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error(`STScI ${response.status}`)

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/gif'

    // Only return if we got an actual image
    if (!contentType.includes('image') && !contentType.includes('octet')) {
      throw new Error('Not an image response')
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(Buffer.from(buffer))
  } catch (err) {
    // Fallback: try Aladin
    try {
      const aladinUrl = `https://aladinlite.u-strasbg.fr/img/hips2fits?hips=CDS/P/DSS2/color&ra=${raDeg}&dec=${decDeg}&fov=${fov}&width=300&height=300&projection=TAN`
      const resp2 = await fetch(aladinUrl, { signal: AbortSignal.timeout(8000) })
      if (resp2.ok) {
        const buf2 = await resp2.arrayBuffer()
        res.setHeader('Content-Type', 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        return res.send(Buffer.from(buf2))
      }
    } catch { /* both failed */ }

    // Return a 1x1 transparent pixel as fallback
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(pixel)
  }
}
