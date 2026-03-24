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

      // Process sequentially to avoid overwhelming DSS server
      for (const target of batch) {
        if (Date.now() - startTime > TIMEOUT_MS) break

        try {
          const fovRaw = Math.max(parseFloat(target.maj_axis_arcmin) || 20, 20) / 60 * 2.5
          const fov = Math.max(0.1, Math.min(10.0, fovRaw))

          // Use NASA SkyView — accepts degrees, returns JPEG
          const dssUrl = `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Position=${target.ra_deg},${target.dec_deg}&Survey=DSS2R&Pixels=300&Size=${fov}&Return=JPEG`

          const dssResponse = await fetch(dssUrl, {
            signal: AbortSignal.timeout(8000),
            redirect: 'follow'
          })
          if (!dssResponse.ok) throw new Error(`SkyView HTTP ${dssResponse.status} for ${target.ngc_ic_id}`)

          const contentType = dssResponse.headers.get('content-type') || ''
          if (!contentType.includes('image')) {
            throw new Error(`SkyView returned ${contentType} not image for ${target.ngc_ic_id}`)
          }

          const imageBuffer = await dssResponse.arrayBuffer()
          const filename = `target-previews/${target.ngc_ic_id}.jpg`

          const blob = await put(filename, Buffer.from(imageBuffer), {
            access: 'public',
            contentType: 'image/jpeg',
            token: process.env.BLOB_READ_WRITE_TOKEN
          })

          await sql`UPDATE targets SET preview_url = ${blob.url} WHERE id = ${target.id}`
          processed++

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (err) {
          failed++
          const msg = err?.message || String(err)
          console.error(`Preview failed for ${target.ngc_ic_id}:`, msg)
          if (errors.length < 5) errors.push(`${target.ngc_ic_id}: ${msg}`)
        }
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
