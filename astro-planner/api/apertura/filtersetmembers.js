import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const sql = neon(process.env.DATABASE_URL)
    const { set_id } = req.query
    if (set_id) {
      const rows = await sql`
        SELECT m.set_id, m.filter_id, m.slot_number, f.model, f.filter_type
        FROM apt_filter_set_members m
        JOIN apt_filters f ON m.filter_id = f.id
        WHERE m.set_id = ${Number(set_id)}
        ORDER BY m.slot_number
      `
      return res.status(200).json(rows)
    }
    const rows = await sql`
      SELECT m.set_id, m.filter_id, m.slot_number, f.model, f.filter_type
      FROM apt_filter_set_members m
      JOIN apt_filters f ON m.filter_id = f.id
      ORDER BY m.set_id, m.slot_number
    `
    return res.status(200).json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
