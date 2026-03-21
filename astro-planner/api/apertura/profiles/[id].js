import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'Missing profile id' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const result = await sql`
      DELETE FROM apt_imaging_profiles WHERE id = ${Number(id)} RETURNING id
    `
    if (result.length === 0) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    return res.status(200).json({ deleted: result[0].id })
  } catch (error) {
    console.error('Delete profile error:', error)
    return res.status(500).json({ error: error.message })
  }
}
