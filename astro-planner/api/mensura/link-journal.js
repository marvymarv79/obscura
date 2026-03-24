import { neon } from '@neondatabase/serverless'
import { withAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { plan_id, journal_entry_id } = req.body

  if (!plan_id || !journal_entry_id) {
    return res.status(400).json({ error: 'plan_id and journal_entry_id are required' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify plan ownership
    const [plan] = await sql`SELECT id FROM plans WHERE id = ${plan_id} AND user_id = ${userId}`
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Link plan to journal entry
    await sql`UPDATE plans SET journal_entry_id = ${journal_entry_id}, updated_at = NOW() WHERE id = ${plan_id}`
    await sql`UPDATE journal_entries SET plan_id = ${plan_id} WHERE id = ${journal_entry_id} AND user_id = ${userId}`

    return res.status(200).json({ success: true, plan_id, journal_entry_id })
  } catch (error) {
    console.error('Mensura link-journal error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
