import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' })
    }
    const sql = neon(process.env.DATABASE_URL)
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS apt_cameras_model_idx ON apt_cameras (model)`
    let imported = 0
    let skipped = 0
    for (const r of rows) {
      const result = await sql`
        INSERT INTO apt_cameras (model, sensor_type, sensor_chip, res_x, res_y, pixel_size_um, bit_depth, bayer_pattern, notes)
        VALUES (${r.model}, ${r.sensor_type || 'OSC'}, ${r.sensor_chip || null}, ${r.res_x ? Number(r.res_x) : null}, ${r.res_y ? Number(r.res_y) : null}, ${r.pixel_size_um ? Number(r.pixel_size_um) : null}, ${r.bit_depth ? Number(r.bit_depth) : null}, ${r.bayer_pattern || null}, ${r.notes || null})
        ON CONFLICT (model) DO NOTHING
        RETURNING id
      `
      if (result.length > 0) imported++
      else skipped++
    }
    return res.status(200).json({ imported, skipped })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
