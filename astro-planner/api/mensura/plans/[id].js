import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Plan ID is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [plan] = await sql`
      SELECT * FROM plans WHERE id = ${id} AND user_id = ${userId}
    `

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    const targets = await sql`
      SELECT pt.*, t.ngc_ic_id, t.common_name, t.messier_number, t.object_type,
        t.best_imaging_type, t.ra_deg, t.dec_deg, t.maj_axis_arcmin, t.magnitude, t.preview_url
      FROM plan_targets pt
      JOIN targets t ON pt.target_id = t.id
      WHERE pt.plan_id = ${id}
      ORDER BY pt.position
    `

    return res.status(200).json({ ...plan, targets })
  } catch (error) {
    console.error('Mensura plan detail error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
