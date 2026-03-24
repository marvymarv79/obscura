import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const setupKey = req.headers['x-setup-key']
  if (!setupKey || setupKey !== process.env.DB_SETUP_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    await sql`ALTER TABLE imaging_plans ADD COLUMN IF NOT EXISTS plan_snapshot JSONB`
    await sql`ALTER TABLE imaging_plans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`
    await sql`ALTER TABLE imaging_plans ADD COLUMN IF NOT EXISTS journal_entry_id UUID`
    await sql`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS plan_id UUID`

    return res.status(200).json({
      success: true,
      message: 'Plans migration complete: plan_snapshot, completed_at, journal_entry_id columns on imaging_plans; plan_id column on journal_entries'
    })
  } catch (error) {
    console.error('Plans migration error:', error)
    return res.status(500).json({ error: error.message })
  }
}
