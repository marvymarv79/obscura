import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const setupKey = req.headers['x-setup-key']
  if (!setupKey || setupKey !== process.env.DB_SETUP_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { targetId, raDeg, decDeg, majAxisArcmin, ngcIcId } = req.body

  if (!targetId || !raDeg || !decDeg) {
    return res.status(400).json({ error: 'targetId, raDeg, decDeg required' })
  }

  try {
    const fovRaw = Math.max(majAxisArcmin || 20, 20) / 60 * 2.5
    const fov = Math.max(0.1, Math.min(10.0, fovRaw))

    const dssUrl = `https://aladinlite.u-strasbg.fr/img/hips2fits?hips=CDS/P/DSS2/color&ra=${raDeg}&dec=${decDeg}&fov=${fov}&width=300&height=300&projection=TAN`

    const dssResponse = await fetch(dssUrl)
    if (!dssResponse.ok) {
      return res.status(502).json({ error: `DSS fetch failed: ${dssResponse.status}` })
    }

    const imageBuffer = await dssResponse.arrayBuffer()
    const filename = `target-previews/${ngcIcId || targetId}.jpg`

    const blob = await put(filename, Buffer.from(imageBuffer), {
      access: 'public',
      contentType: 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN
    })

    const sql = neon(process.env.DATABASE_URL)
    await sql`UPDATE targets SET preview_url = ${blob.url} WHERE id = ${parseInt(targetId)}`

    return res.status(200).json({ targetId, previewUrl: blob.url })
  } catch (error) {
    console.error('Cache preview error:', error)
    return res.status(500).json({ error: error.message })
  }
}
