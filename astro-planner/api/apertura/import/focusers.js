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
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS apt_focusers_model_idx ON apt_focusers (model)`
    let imported = 0
    let skipped = 0
    for (const r of rows) {
      const result = await sql`
        INSERT INTO apt_focusers (model, steps_per_rotation, travel_range_mm, connection_type, notes)
        VALUES (${r.model}, ${r.steps_per_rotation ? Number(r.steps_per_rotation) : null}, ${r.travel_range_mm ? Number(r.travel_range_mm) : null}, ${r.connection_type || null}, ${r.notes || null})
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
