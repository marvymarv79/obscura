import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT a.*, l.name AS location_name
        FROM vig_ammo a
        LEFT JOIN vig_locations l ON a.location_id = l.id
        WHERE a.user_id = ${userId}
        ORDER BY a.created_at DESC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { caliber, brand, load_name, ammo_type, quantity, location_id, notes } = req.body

      const [created] = await sql`
        INSERT INTO vig_ammo (user_id, caliber, brand, load_name, ammo_type, quantity, location_id, notes)
        VALUES (${userId}, ${caliber ?? null}, ${brand ?? null}, ${load_name ?? null},
                ${ammo_type ?? null}, ${quantity ?? 0}, ${location_id ?? null}, ${notes ?? null})
        RETURNING *
      `
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vigilia ammo error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
