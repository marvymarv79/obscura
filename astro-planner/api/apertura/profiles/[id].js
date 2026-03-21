import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  const { id } = req.query

  console.log('profiles/[id] hit:', { method: req.method, id, query: req.query })

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method })
  }

  if (!id) {
    return res.status(400).json({ error: 'Missing profile id' })
  }

  const numId = parseInt(id, 10)
  if (isNaN(numId)) {
    return res.status(400).json({ error: 'Invalid profile id', received: id })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const result = await sql`
      DELETE FROM apt_imaging_profiles WHERE id = ${numId} RETURNING id
    `
    if (result.length === 0) {
      return res.status(404).json({ error: 'Profile not found', id: numId })
    }
    return res.status(200).json({ deleted: result[0].id })
  } catch (error) {
    console.error('Delete profile error:', { id: numId, message: error.message, stack: error.stack })
    return res.status(500).json({ error: error.message })
  }
}
