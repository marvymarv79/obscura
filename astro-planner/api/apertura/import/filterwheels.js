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
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS apt_filter_wheels_model_idx ON apt_filter_wheels (model)`
    let imported = 0
    let skipped = 0
    for (const r of rows) {
      const result = await sql`
        INSERT INTO apt_filter_wheels (model, slot_count, compatible_filter_sizes, notes)
        VALUES (${r.model}, ${r.slot_count ? Number(r.slot_count) : null}, ${r.compatible_filter_sizes || null}, ${r.notes || null})
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
