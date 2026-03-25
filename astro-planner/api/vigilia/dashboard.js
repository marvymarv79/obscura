import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Food days: sum of food qty / 3 meals per day
    const [foodResult] = await sql`
      SELECT COALESCE(SUM(quantity), 0)::numeric AS total
      FROM vig_inventory
      WHERE user_id = ${userId} AND category = 'food'
    `
    const foodDays = Math.floor(parseFloat(foodResult.total) / 3)

    // Water days: sum of water qty in liters / 2L per day
    const [waterResult] = await sql`
      SELECT COALESCE(SUM(quantity), 0)::numeric AS total
      FROM vig_inventory
      WHERE user_id = ${userId} AND category = 'water'
    `
    const waterDays = Math.floor(parseFloat(waterResult.total) / 2)

    // Expiring soon: items with expiration_date within 30 days from now
    const expiringSoon = await sql`
      SELECT i.*, l.name AS location_name
      FROM vig_inventory i
      LEFT JOIN vig_locations l ON i.location_id = l.id
      WHERE i.user_id = ${userId}
        AND i.expiration_date IS NOT NULL
        AND i.expiration_date <= NOW() + INTERVAL '30 days'
        AND i.expiration_date >= NOW()
      ORDER BY i.expiration_date ASC
    `

    // Below threshold: items where quantity < min_threshold
    const belowThreshold = await sql`
      SELECT i.*, l.name AS location_name
      FROM vig_inventory i
      LEFT JOIN vig_locations l ON i.location_id = l.id
      WHERE i.user_id = ${userId}
        AND i.min_threshold IS NOT NULL
        AND i.quantity < i.min_threshold
      ORDER BY i.name ASC
    `

    // By location breakdown
    const byLocation = await sql`
      SELECT
        l.name AS location_name,
        COUNT(i.id)::int AS item_count,
        COALESCE(SUM(CASE WHEN i.category = 'food' THEN i.quantity ELSE 0 END), 0)::numeric AS food_qty,
        COALESCE(SUM(CASE WHEN i.category = 'water' THEN i.quantity ELSE 0 END), 0)::numeric AS water_qty
      FROM vig_locations l
      LEFT JOIN vig_inventory i ON i.location_id = l.id AND i.user_id = ${userId}
      WHERE l.user_id = ${userId}
      GROUP BY l.id, l.name
      ORDER BY l.name ASC
    `

    const byLocationFormatted = byLocation.map(row => ({
      locationName: row.location_name,
      itemCount: row.item_count,
      foodDays: Math.floor(parseFloat(row.food_qty) / 3),
      waterDays: Math.floor(parseFloat(row.water_qty) / 2)
    }))

    return res.status(200).json({
      foodDays,
      waterDays,
      expiringSoon,
      belowThreshold,
      byLocation: byLocationFormatted
    })
  } catch (error) {
    console.error('Vigilia dashboard error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
