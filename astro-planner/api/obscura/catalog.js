import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { search, type, limit: limitParam, offset: offsetParam } = req.query
  const limit = Math.min(parseInt(limitParam) || 50, 200)
  const offset = parseInt(offsetParam) || 0

  try {
    const sql = neon(process.env.DATABASE_URL)

    let results
    if (search && type && type !== 'all') {
      const pattern = `%${search}%`
      results = await sql`
        SELECT id, ngc_ic_id, common_name, messier_number, object_type,
               best_imaging_type, magnitude, maj_axis_arcmin, preview_url
        FROM targets
        WHERE (ngc_ic_id ILIKE ${pattern}
               OR common_name ILIKE ${pattern}
               OR CAST(messier_number AS TEXT) = ${search.replace(/^[Mm]/, '')})
          AND (object_type = ${type} OR best_imaging_type = ${type})
        ORDER BY magnitude ASC NULLS LAST, ngc_ic_id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (search) {
      const pattern = `%${search}%`
      const messierNum = search.replace(/^[Mm]/, '')
      results = await sql`
        SELECT id, ngc_ic_id, common_name, messier_number, object_type,
               best_imaging_type, magnitude, maj_axis_arcmin, preview_url
        FROM targets
        WHERE ngc_ic_id ILIKE ${pattern}
              OR common_name ILIKE ${pattern}
              OR CAST(messier_number AS TEXT) = ${messierNum}
        ORDER BY magnitude ASC NULLS LAST, ngc_ic_id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (type && type !== 'all') {
      results = await sql`
        SELECT id, ngc_ic_id, common_name, messier_number, object_type,
               best_imaging_type, magnitude, maj_axis_arcmin, preview_url
        FROM targets
        WHERE object_type = ${type} OR best_imaging_type = ${type}
        ORDER BY magnitude ASC NULLS LAST, ngc_ic_id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      results = await sql`
        SELECT id, ngc_ic_id, common_name, messier_number, object_type,
               best_imaging_type, magnitude, maj_axis_arcmin, preview_url
        FROM targets
        ORDER BY magnitude ASC NULLS LAST, ngc_ic_id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    return res.status(200).json(results)
  } catch (error) {
    console.error('Catalog API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
