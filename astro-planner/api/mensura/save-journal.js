import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { planId, title, content, entryDate } = req.body

  if (!planId || !title || !content || !entryDate) {
    return res.status(400).json({ error: 'planId, title, content, and entryDate are required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify plan ownership
    const [plan] = await sql`SELECT id FROM plans WHERE id = ${planId} AND user_id = ${userId}`
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Create journal entry with plan_id link
    const [entry] = await sql`
      INSERT INTO journal_entries (user_id, title, content, entry_date, plan_id)
      VALUES (${userId}, ${title}, ${content}, ${entryDate}, ${planId})
      RETURNING *
    `

    // Link plan back to journal entry
    await sql`
      UPDATE plans
      SET journal_entry_id = ${entry.id}, updated_at = NOW()
      WHERE id = ${planId} AND user_id = ${userId}
    `

    // Mark plan as complete if not already
    await sql`
      UPDATE plans
      SET status = 'complete', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE id = ${planId} AND user_id = ${userId}
    `

    return res.status(201).json(entry)
  } catch (error) {
    console.error('[save-journal] Error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
