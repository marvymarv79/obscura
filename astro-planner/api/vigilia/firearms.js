import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT f.*, l.name AS location_name
        FROM vig_firearms f
        LEFT JOIN vig_locations l ON f.location_id = l.id
        WHERE f.user_id = ${userId}
        ORDER BY f.created_at DESC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { make, model, caliber, has_optic, optic_type, location_id, notes } = req.body

      const [created] = await sql`
        INSERT INTO vig_firearms (user_id, make, model, caliber, has_optic, optic_type, location_id, notes)
        VALUES (${userId}, ${make ?? null}, ${model ?? null}, ${caliber ?? null},
                ${has_optic ?? false}, ${optic_type ?? null}, ${location_id ?? null}, ${notes ?? null})
        RETURNING *
      `
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vigilia firearms error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
