import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM vig_vehicles
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { name, vehicle_type, year, make, model, has_inventory, notes } = req.body

      const [created] = await sql`
        INSERT INTO vig_vehicles (user_id, name, vehicle_type, year, make, model, has_inventory, notes)
        VALUES (${userId}, ${name ?? null}, ${vehicle_type ?? null}, ${year ?? null},
                ${make ?? null}, ${model ?? null}, ${has_inventory ?? false}, ${notes ?? null})
        RETURNING *
      `
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vigilia vehicles error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
