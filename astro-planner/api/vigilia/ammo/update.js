import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, caliber, brand, load_name, ammo_type, quantity, location_id, notes } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [existing] = await sql`
      SELECT id FROM vig_ammo WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return res.status(404).json({ error: 'Ammo not found' })
    }

    const [updated] = await sql`
      UPDATE vig_ammo
      SET caliber = COALESCE(${caliber ?? null}, caliber),
          brand = COALESCE(${brand ?? null}, brand),
          load_name = COALESCE(${load_name ?? null}, load_name),
          ammo_type = COALESCE(${ammo_type ?? null}, ammo_type),
          quantity = COALESCE(${quantity ?? null}, quantity),
          location_id = COALESCE(${location_id ?? null}, location_id),
          notes = COALESCE(${notes ?? null}, notes),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Vigilia ammo update error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
