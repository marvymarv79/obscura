import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const setupKey = req.headers['x-setup-key']
  if (!setupKey || setupKey !== process.env.DB_SETUP_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const targets = await sql`
      SELECT id, ngc_ic_id, ra_deg, dec_deg, maj_axis_arcmin
      FROM targets
      WHERE preview_url IS NULL
      ORDER BY id
      LIMIT 500
    `

    let processed = 0
    let failed = 0
    const total = targets.length

    for (const target of targets) {
      try {
        const fovRaw = Math.max(parseFloat(target.maj_axis_arcmin) || 20, 20) / 60 * 2.5
        const fov = Math.max(0.1, Math.min(10.0, fovRaw))

        const previewUrl = `https://aladinlite.u-strasbg.fr/img/hips2fits?hips=CDS/P/DSS2/color&ra=${target.ra_deg}&dec=${target.dec_deg}&fov=${fov}&width=300&height=300&projection=TAN`

        await sql`UPDATE targets SET preview_url = ${previewUrl} WHERE id = ${target.id}`
        processed++
      } catch (err) {
        failed++
      }
    }

    return res.status(200).json({
      success: true,
      processed, failed, total,
      message: `Processed ${processed}/${total}, ${failed} failed.`
    })
  } catch (error) {
    console.error('Backfill error:', error)
    return res.status(500).json({ error: error.message })
  }
}
