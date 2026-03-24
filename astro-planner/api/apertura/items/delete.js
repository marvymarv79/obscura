import { neon } from '@neondatabase/serverless'

const ALLOWED_TABLES = ['apt_cameras', 'apt_optics', 'apt_accessories', 'apt_filters', 'apt_filter_wheels', 'apt_mounts', 'apt_focusers']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { table, id } = req.body
    if (!table || !id) return res.status(400).json({ error: 'Missing table or id' })
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' })

    const sql = neon(process.env.DATABASE_URL)
    await sql`DELETE FROM ${sql(table)} WHERE id = ${parseInt(id)}`

    return res.status(200).json({ deleted: true, id: parseInt(id) })
  } catch (error) {
    console.error('[api/apertura/items/delete] Error', { message: error.message })
    return res.status(500).json({ error: error.message })
  }
}
