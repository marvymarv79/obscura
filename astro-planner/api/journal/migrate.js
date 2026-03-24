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

    // Add imaging_train_id column if not exists
    await sql`
      ALTER TABLE journal_entries
      ADD COLUMN IF NOT EXISTS imaging_train_id INTEGER
    `

    // Add processing_software column if not exists
    await sql`
      ALTER TABLE journal_entries
      ADD COLUMN IF NOT EXISTS processing_software TEXT
    `

    return res.status(200).json({
      success: true,
      message: 'Journal migration complete: added imaging_train_id and processing_software columns'
    })
  } catch (error) {
    console.error('Journal migration error:', error)
    return res.status(500).json({ error: error.message })
  }
}
