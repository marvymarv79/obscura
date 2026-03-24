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

  const startTime = Date.now()
  const TIMEOUT_MS = 50000

  try {
    const sql = neon(process.env.DATABASE_URL)
    const targets = await sql`
      SELECT id, ngc_ic_id, ra_deg, dec_deg, maj_axis_arcmin
      FROM targets
      WHERE preview_url IS NULL
      ORDER BY id
      LIMIT 200
    `

    let processed = 0
    let failed = 0
    const total = targets.length
    const batchSize = 10
    const errors = []

    for (let i = 0; i < targets.length; i += batchSize) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        return res.status(200).json({
          success: true,
          processed, failed, total,
          message: `Timeout approaching — processed ${processed}/${total}, ${failed} failed. Run again for remaining.`
        })
      }

      const batch = targets.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(async (target) => {
          const fovRaw = Math.max(parseFloat(target.maj_axis_arcmin) || 20, 20) / 60 * 2.5
          const fov = Math.max(0.1, Math.min(10.0, fovRaw))

          const dssUrl = `https://aladinlite.u-strasbg.fr/img/hips2fits?hips=CDS/P/DSS2/color&ra=${target.ra_deg}&dec=${target.dec_deg}&fov=${fov}&width=300&height=300&projection=TAN`

          const dssResponse = await fetch(dssUrl)
          if (!dssResponse.ok) throw new Error(`DSS ${dssResponse.status}`)

          const imageBuffer = await dssResponse.arrayBuffer()
          const filename = `target-previews/${target.ngc_ic_id}.jpg`

          const blob = await put(filename, Buffer.from(imageBuffer), {
            access: 'public',
            contentType: 'image/jpeg',
            token: process.env.BLOB_READ_WRITE_TOKEN
          })

          await sql`UPDATE targets SET preview_url = ${blob.url} WHERE id = ${target.id}`
          return blob.url
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') processed++
        else {
          failed++
          const msg = r.reason?.message || String(r.reason)
          console.error('Preview failed:', msg)
          if (errors.length < 3) errors.push(msg)
        }
      }

      // Rate limit delay between batches
      if (i + batchSize < targets.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return res.status(200).json({
      success: true,
      processed, failed, total,
      sampleErrors: errors.length > 0 ? errors : undefined,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      message: `Processed ${processed}/${total}, ${failed} failed.`
    })
  } catch (error) {
    console.error('Backfill error:', error)
    return res.status(500).json({ error: error.message })
  }
}
