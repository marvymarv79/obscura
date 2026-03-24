import { neon } from '@neondatabase/serverless'

const MISSING_TARGETS = [
  { ngc_ic_id: 'NGC2903', common_name: null, object_type: 'Galaxy', ra_deg: 143.042, dec_deg: 21.501, maj_axis_arcmin: 12.6, min_axis_arcmin: 6.6, magnitude: 8.9, best_imaging_type: 'lrgb' },
  { ngc_ic_id: 'NGC7000', common_name: 'North America Nebula', object_type: 'EN', ra_deg: 314.75, dec_deg: 44.53, maj_axis_arcmin: 120.0, min_axis_arcmin: null, magnitude: 4.0, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'IC5070', common_name: 'Pelican Nebula', object_type: 'EN', ra_deg: 312.75, dec_deg: 44.37, maj_axis_arcmin: 60.0, min_axis_arcmin: null, magnitude: 8.0, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'NGC1499', common_name: 'California Nebula', object_type: 'EN', ra_deg: 60.627, dec_deg: 36.542, maj_axis_arcmin: 145.0, min_axis_arcmin: null, magnitude: 5.0, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'NGC2244', common_name: 'Rosette Cluster', object_type: 'OCl', ra_deg: 97.977, dec_deg: 4.952, maj_axis_arcmin: 24.0, min_axis_arcmin: null, magnitude: 4.8, best_imaging_type: 'broadband' },
  { ngc_ic_id: 'IC1805', common_name: 'Heart Nebula', object_type: 'EN', ra_deg: 38.175, dec_deg: 61.45, maj_axis_arcmin: 60.0, min_axis_arcmin: null, magnitude: 6.5, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'IC1848', common_name: 'Soul Nebula', object_type: 'EN', ra_deg: 43.25, dec_deg: 60.4, maj_axis_arcmin: 60.0, min_axis_arcmin: null, magnitude: 6.5, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'NGC6992', common_name: 'Eastern Veil Nebula', object_type: 'EN', ra_deg: 313.4, dec_deg: 31.73, maj_axis_arcmin: 60.0, min_axis_arcmin: null, magnitude: 7.0, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'NGC6960', common_name: 'Western Veil Nebula', object_type: 'EN', ra_deg: 312.35, dec_deg: 30.72, maj_axis_arcmin: 70.0, min_axis_arcmin: null, magnitude: 7.0, best_imaging_type: 'narrowband' },
  { ngc_ic_id: 'NGC3372', common_name: 'Carina Nebula', object_type: 'EN', ra_deg: 160.98, dec_deg: -59.87, maj_axis_arcmin: 120.0, min_axis_arcmin: null, magnitude: 1.0, best_imaging_type: 'narrowband' }
]

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
    let inserted = 0

    for (const t of MISSING_TARGETS) {
      const result = await sql`
        INSERT INTO targets (ngc_ic_id, common_name, object_type, ra_deg, dec_deg,
          maj_axis_arcmin, min_axis_arcmin, magnitude, best_imaging_type)
        VALUES (${t.ngc_ic_id}, ${t.common_name}, ${t.object_type}, ${t.ra_deg}, ${t.dec_deg},
          ${t.maj_axis_arcmin}, ${t.min_axis_arcmin}, ${t.magnitude}, ${t.best_imaging_type})
        ON CONFLICT (ngc_ic_id) DO NOTHING
        RETURNING id
      `
      if (result.length > 0) inserted++
    }

    // Backfill preview URLs for any targets missing them
    const noPreview = await sql`
      SELECT id, ngc_ic_id, ra_deg, dec_deg, maj_axis_arcmin
      FROM targets WHERE preview_url IS NULL
    `
    for (const target of noPreview) {
      const fovRaw = Math.max(parseFloat(target.maj_axis_arcmin) || 20, 20) / 60 * 2.5
      const fov = Math.max(0.1, Math.min(10.0, fovRaw))
      const previewUrl = `https://aladinlite.u-strasbg.fr/img/hips2fits?hips=CDS/P/DSS2/color&ra=${target.ra_deg}&dec=${target.dec_deg}&fov=${fov}&width=300&height=300&projection=TAN`
      await sql`UPDATE targets SET preview_url = ${previewUrl} WHERE id = ${target.id}`
    }

    return res.status(200).json({
      success: true,
      inserted,
      previewsBackfilled: noPreview.length,
      message: `Inserted ${inserted} new targets, backfilled ${noPreview.length} preview URLs`
    })
  } catch (error) {
    console.error('Add missing targets error:', error)
    return res.status(500).json({ error: error.message })
  }
}
