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

    // Create targets table
    await sql`
      CREATE TABLE IF NOT EXISTS targets (
        id SERIAL PRIMARY KEY,
        ngc_ic_id TEXT UNIQUE NOT NULL,
        common_name TEXT,
        object_type TEXT NOT NULL,
        ra_deg NUMERIC(10,6) NOT NULL,
        dec_deg NUMERIC(9,6) NOT NULL,
        maj_axis_arcmin NUMERIC(8,3),
        min_axis_arcmin NUMERIC(8,3),
        magnitude NUMERIC(5,2),
        surface_brightness NUMERIC(5,2),
        best_imaging_type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_targets_ra ON targets(ra_deg)`
    await sql`CREATE INDEX IF NOT EXISTS idx_targets_dec ON targets(dec_deg)`
    await sql`CREATE INDEX IF NOT EXISTS idx_targets_type ON targets(object_type)`

    // Add min_altitude_deg to locations
    await sql`
      ALTER TABLE locations
      ADD COLUMN IF NOT EXISTS min_altitude_deg INTEGER DEFAULT 25
    `

    // Update Midland location
    await sql`
      UPDATE locations
      SET min_altitude_deg = 35
      WHERE name ILIKE '%midland%'
    `

    return res.status(200).json({
      success: true,
      message: 'Target catalog migration complete: targets table, indexes, and min_altitude_deg column added'
    })
  } catch (error) {
    console.error('Target migration error:', error)
    return res.status(500).json({ error: error.message })
  }
}
