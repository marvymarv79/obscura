import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify ownership
    const [existing] = await sql`
      SELECT id FROM vig_locations WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return res.status(404).json({ error: 'Location not found' })
    }

    // Check if location has items assigned
    const [firearms] = await sql`SELECT COUNT(*)::int AS count FROM vig_firearms WHERE location_id = ${id}`
    const [suppressors] = await sql`SELECT COUNT(*)::int AS count FROM vig_suppressors WHERE location_id = ${id}`
    const [ammo] = await sql`SELECT COUNT(*)::int AS count FROM vig_ammo WHERE location_id = ${id}`
    const [inventory] = await sql`SELECT COUNT(*)::int AS count FROM vig_inventory WHERE location_id = ${id}`

    const totalAssigned = firearms.count + suppressors.count + ammo.count + inventory.count
    if (totalAssigned > 0) {
      return res.status(400).json({
        error: 'Cannot delete location with assigned items',
        details: `${totalAssigned} item(s) are assigned to this location. Reassign them first.`
      })
    }

    const [deleted] = await sql`
      DELETE FROM vig_locations
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `

    return res.status(200).json({ deleted: true, id: deleted.id })
  } catch (error) {
    console.error('Vigilia location delete error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
