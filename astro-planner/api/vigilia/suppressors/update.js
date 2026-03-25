import { neon } from '@neondatabase/serverless'
import { withAuth } from '../../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, make, model, caliber, thread_pitch, host_firearms, location_id, notes } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [existing] = await sql`
      SELECT id FROM vig_suppressors WHERE id = ${id} AND user_id = ${userId}
    `
    if (!existing) {
      return res.status(404).json({ error: 'Suppressor not found' })
    }

    const [updated] = await sql`
      UPDATE vig_suppressors
      SET make = COALESCE(${make ?? null}, make),
          model = COALESCE(${model ?? null}, model),
          caliber = COALESCE(${caliber ?? null}, caliber),
          thread_pitch = COALESCE(${thread_pitch ?? null}, thread_pitch),
          host_firearms = COALESCE(${host_firearms ?? null}, host_firearms),
          location_id = COALESCE(${location_id ?? null}, location_id),
          notes = COALESCE(${notes ?? null}, notes),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Vigilia suppressor update error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
