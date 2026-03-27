import { neon } from '@neondatabase/serverless'

const DEFAULT_LOCATIONS = ['Home', 'Ranch', 'Truck', 'Landcruiser', 'Nomad']

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

    // Add is_protected column if it doesn't exist
    await sql`
      ALTER TABLE vig_locations
      ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false
    `

    // Mark default locations as protected for all users
    for (const name of DEFAULT_LOCATIONS) {
      await sql`
        UPDATE vig_locations
        SET is_protected = true
        WHERE name = ${name}
      `
    }

    return res.status(200).json({
      success: true,
      message: 'Added is_protected column and marked default locations as protected'
    })
  } catch (error) {
    console.error('Vigilia migrate-protected-locations error:', error)
    return res.status(500).json({ error: 'Database error', details: error.message })
  }
}
