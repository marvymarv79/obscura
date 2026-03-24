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

    // Drop old tables
    await sql`DROP TABLE IF EXISTS imaging_plan_targets CASCADE`
    await sql`DROP TABLE IF EXISTS imaging_plans CASCADE`

    // Create new clean schema
    await sql`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        name TEXT,
        plan_date DATE NOT NULL,
        location_name TEXT NOT NULL,
        latitude NUMERIC(10,6) NOT NULL,
        longitude NUMERIC(10,6) NOT NULL,
        forecast_score INTEGER,
        utc_offset_minutes INTEGER,
        status TEXT DEFAULT 'draft',
        completed_at TIMESTAMPTZ,
        journal_entry_id UUID,
        snapshot JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS plan_targets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
        target_id INTEGER REFERENCES targets(id),
        position INTEGER DEFAULT 0,
        window_start TIME,
        window_end TIME,
        imaging_train_id TEXT,
        snapshot JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_plan_targets_plan ON plan_targets(plan_id)`

    // Add plan_id to journal_entries if not exists
    await sql`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS plan_id UUID`

    return res.status(200).json({
      success: true,
      message: 'Mensura setup complete: plans + plan_targets tables created, old tables dropped'
    })
  } catch (error) {
    console.error('Mensura setup error:', error)
    return res.status(500).json({ error: error.message })
  }
}
