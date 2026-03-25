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
      CREATE TABLE IF NOT EXISTS vig_locations (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS vig_firearms (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        make TEXT,
        model TEXT,
        caliber TEXT,
        has_optic BOOLEAN DEFAULT false,
        optic_type TEXT,
        location_id INTEGER REFERENCES vig_locations(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS vig_suppressors (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        make TEXT,
        model TEXT,
        caliber TEXT,
        thread_pitch TEXT,
        host_firearms TEXT,
        location_id INTEGER REFERENCES vig_locations(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS vig_ammo (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        caliber TEXT,
        brand TEXT,
        load_name TEXT,
        ammo_type TEXT CHECK (ammo_type IN ('subsonic', 'supersonic', 'standard')),
        quantity INTEGER DEFAULT 0,
        location_id INTEGER REFERENCES vig_locations(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS vig_vehicles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT,
        vehicle_type TEXT,
        year INTEGER,
        make TEXT,
        model TEXT,
        has_inventory BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS vig_inventory (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT,
        category TEXT,
        quantity NUMERIC,
        unit TEXT,
        expiration_date DATE,
        location_id INTEGER REFERENCES vig_locations(id),
        min_threshold NUMERIC,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_vig_locations_user ON vig_locations(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vig_firearms_user ON vig_firearms(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vig_suppressors_user ON vig_suppressors(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vig_ammo_user ON vig_ammo(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vig_vehicles_user ON vig_vehicles(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_vig_inventory_user ON vig_inventory(user_id)`

    return res.status(200).json({
      success: true,
      message: 'Vigilia setup complete: all vig_* tables created'
    })
  } catch (error) {
    console.error('Vigilia setup error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}
