import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, make, model, caliber, has_optic, optic_type, location_id, notes } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [existing] = await sql`
      SELECT id FROM vig_firearms WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return res.status(404).json({ error: 'Firearm not found' })
    }

    const [updated] = await sql`
      UPDATE vig_firearms
      SET make = COALESCE(${make ?? null}, make),
          model = COALESCE(${model ?? null}, model),
          caliber = COALESCE(${caliber ?? null}, caliber),
          has_optic = COALESCE(${has_optic ?? null}, has_optic),
          optic_type = COALESCE(${optic_type ?? null}, optic_type),
          location_id = COALESCE(${location_id ?? null}, location_id),
          notes = COALESCE(${notes ?? null}, notes),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Vigilia firearm update error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
