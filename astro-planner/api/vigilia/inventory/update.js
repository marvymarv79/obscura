import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, name, category, quantity, unit, expiration_date, location_id, min_threshold, notes } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [existing] = await sql`
      SELECT id FROM vig_inventory WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return res.status(404).json({ error: 'Inventory item not found' })
    }

    const [updated] = await sql`
      UPDATE vig_inventory
      SET name = COALESCE(${name ?? null}, name),
          category = COALESCE(${category ?? null}, category),
          quantity = COALESCE(${quantity ?? null}, quantity),
          unit = COALESCE(${unit ?? null}, unit),
          expiration_date = COALESCE(${expiration_date ?? null}, expiration_date),
          location_id = COALESCE(${location_id ?? null}, location_id),
          min_threshold = COALESCE(${min_threshold ?? null}, min_threshold),
          notes = COALESCE(${notes ?? null}, notes),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Vigilia inventory update error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
