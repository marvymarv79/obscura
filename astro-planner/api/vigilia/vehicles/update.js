import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, name, vehicle_type, year, make, model, has_inventory, notes } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [existing] = await sql`
      SELECT id FROM vig_vehicles WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' })
    }

    const [updated] = await sql`
      UPDATE vig_vehicles
      SET name = COALESCE(${name ?? null}, name),
          vehicle_type = COALESCE(${vehicle_type ?? null}, vehicle_type),
          year = COALESCE(${year ?? null}, year),
          make = COALESCE(${make ?? null}, make),
          model = COALESCE(${model ?? null}, model),
          has_inventory = COALESCE(${has_inventory ?? null}, has_inventory),
          notes = COALESCE(${notes ?? null}, notes),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Vigilia vehicle update error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
