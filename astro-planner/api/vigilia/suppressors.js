import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT s.*, l.name AS location_name
        FROM vig_suppressors s
        LEFT JOIN vig_locations l ON s.location_id = l.id
        WHERE s.user_id = ${userId}
        ORDER BY s.created_at DESC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { make, model, caliber, thread_pitch, host_firearms, location_id, notes } = req.body

      const [created] = await sql`
        INSERT INTO vig_suppressors (user_id, make, model, caliber, thread_pitch, host_firearms, location_id, notes)
        VALUES (${userId}, ${make ?? null}, ${model ?? null}, ${caliber ?? null},
                ${thread_pitch ?? null}, ${host_firearms ?? null}, ${location_id ?? null}, ${notes ?? null})
        RETURNING *
      `
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vigilia suppressors error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
