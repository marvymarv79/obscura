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
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS apt_filters_model_idx ON apt_filters (model)`
    let imported = 0
    let skipped = 0
    for (const r of rows) {
      const result = await sql`
        INSERT INTO apt_filters (model, filter_type, size_description, bandpass_nm, bandpass_width_nm, transmission_pct, notes)
        VALUES (${r.model}, ${r.filter_type || 'L'}, ${r.size_description || null}, ${r.bandpass_nm ? Number(r.bandpass_nm) : null}, ${r.bandpass_width_nm ? Number(r.bandpass_width_nm) : null}, ${r.transmission_pct ? Number(r.transmission_pct) : null}, ${r.notes || null})
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
