import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const { category, location_id } = req.query || {}

      let rows
      if (category && location_id) {
        rows = await sql`
          SELECT i.*, l.name AS location_name
          FROM vig_inventory i
          LEFT JOIN vig_locations l ON i.location_id = l.id
          WHERE i.user_id = ${userId}
            AND i.category = ${category}
            AND i.location_id = ${parseInt(location_id)}
          ORDER BY i.created_at DESC
        `
      } else if (category) {
        rows = await sql`
          SELECT i.*, l.name AS location_name
          FROM vig_inventory i
          LEFT JOIN vig_locations l ON i.location_id = l.id
          WHERE i.user_id = ${userId}
            AND i.category = ${category}
          ORDER BY i.created_at DESC
        `
      } else if (location_id) {
        rows = await sql`
          SELECT i.*, l.name AS location_name
          FROM vig_inventory i
          LEFT JOIN vig_locations l ON i.location_id = l.id
          WHERE i.user_id = ${userId}
            AND i.location_id = ${parseInt(location_id)}
          ORDER BY i.created_at DESC
        `
      } else {
        rows = await sql`
          SELECT i.*, l.name AS location_name
          FROM vig_inventory i
          LEFT JOIN vig_locations l ON i.location_id = l.id
          WHERE i.user_id = ${userId}
          ORDER BY i.created_at DESC
        `
      }

      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { name, category, quantity, unit, expiration_date, location_id, min_threshold, notes } = req.body

      const [created] = await sql`
        INSERT INTO vig_inventory (user_id, name, category, quantity, unit, expiration_date, location_id, min_threshold, notes)
        VALUES (${userId}, ${name ?? null}, ${category ?? null}, ${quantity ?? null},
                ${unit ?? null}, ${expiration_date ?? null}, ${location_id ?? null},
                ${min_threshold ?? null}, ${notes ?? null})
        RETURNING *
      `
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vigilia inventory error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
