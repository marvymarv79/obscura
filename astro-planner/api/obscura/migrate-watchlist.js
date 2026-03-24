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

    await sql`
      CREATE TABLE IF NOT EXISTS watchlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        target_id INTEGER REFERENCES targets(id) ON DELETE CASCADE,
        alerts_enabled BOOLEAN DEFAULT true,
        planned_nights INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, target_id)
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS watchlist_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        target_count INTEGER,
        location_name TEXT,
        alert_date DATE
      )
    `

    await sql`
      ALTER TABLE targets ADD COLUMN IF NOT EXISTS preview_url TEXT
    `

    return res.status(200).json({
      success: true,
      message: 'Watchlist migration complete: watchlist, watchlist_alerts tables and preview_url column added'
    })
  } catch (error) {
    console.error('Watchlist migration error:', error)
    return res.status(500).json({ error: error.message })
  }
}
