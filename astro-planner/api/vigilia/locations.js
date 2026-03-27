import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

const DEFAULT_LOCATIONS = ['Home', 'Ranch', 'Truck', 'Landcruiser', 'Nomad']

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      // Check if user has any locations; if not, seed defaults
      const existing = await sql`
        SELECT id FROM vig_locations WHERE user_id = ${userId} LIMIT 1
      `
      if (existing.length === 0) {
        for (const name of DEFAULT_LOCATIONS) {
          await sql`
            INSERT INTO vig_locations (user_id, name, is_protected)
            VALUES (${userId}, ${name}, true)
          `
        }
      }

      const rows = await sql`
        SELECT * FROM vig_locations
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { name, notes } = req.body

      if (!name) {
        return res.status(400).json({ error: 'name is required' })
      }

      const [created] = await sql`
        INSERT INTO vig_locations (user_id, name, notes)
        VALUES (${userId}, ${name}, ${notes ?? null})
        RETURNING *
      `
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vigilia locations error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
