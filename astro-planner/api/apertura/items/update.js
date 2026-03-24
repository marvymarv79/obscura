import { neon } from '@neondatabase/serverless'

const ALLOWED_TABLES = ['apt_cameras', 'apt_optics', 'apt_accessories', 'apt_filters', 'apt_filter_wheels', 'apt_mounts', 'apt_focusers']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { table, id, fields } = req.body
    if (!table || !id || !fields) return res.status(400).json({ error: 'Missing table, id, or fields' })
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' })

    const sql = neon(process.env.DATABASE_URL)

    // Build SET clause from fields
    const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at')
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    // Use parameterized updates one field at a time for safety
    for (const key of keys) {
      await sql`UPDATE ${sql(table)} SET ${sql(key)} = ${fields[key]} WHERE id = ${parseInt(id)}`
    }

    const [updated] = await sql`SELECT * FROM ${sql(table)} WHERE id = ${parseInt(id)}`
    return res.status(200).json(updated)
  } catch (error) {
    console.error('[api/apertura/items/update] Error', { message: error.message })
    return res.status(500).json({ error: error.message })
  }
}
