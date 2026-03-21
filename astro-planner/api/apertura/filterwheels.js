import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT * FROM apt_filter_wheels ORDER BY id`
    return res.status(200).json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
