import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  try {
    const sql = neon(process.env.DATABASE_URL)

    switch (req.method) {
      case 'GET': {
        const plans = await sql`
          SELECT p.*,
            (SELECT COUNT(*) FROM plan_targets WHERE plan_id = p.id) as target_count,
            (SELECT COALESCE(json_agg(t_sub.name), '[]'::json) FROM (
              SELECT COALESCE(t.common_name, t.ngc_ic_id) as name
              FROM plan_targets pt JOIN targets t ON pt.target_id = t.id
              WHERE pt.plan_id = p.id ORDER BY pt.position LIMIT 3
            ) t_sub) as target_names
          FROM plans p
          WHERE p.user_id = ${userId}
          ORDER BY p.plan_date DESC
        `
        return res.status(200).json(plans)
      }

      case 'POST': {
        const { plan_date, location_name, latitude, longitude, forecast_score, utc_offset_minutes } = req.body

        if (!plan_date || !location_name || latitude == null || longitude == null) {
          return res.status(400).json({ error: 'plan_date, location_name, latitude, and longitude are required' })
        }

        const [plan] = await sql`
          INSERT INTO plans (user_id, plan_date, location_name, latitude, longitude, forecast_score, utc_offset_minutes)
          VALUES (${userId}, ${plan_date}, ${location_name}, ${latitude}, ${longitude}, ${forecast_score ?? null}, ${utc_offset_minutes ?? null})
          RETURNING *
        `

        return res.status(201).json(plan)
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('[api/mensura/plans] Error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
