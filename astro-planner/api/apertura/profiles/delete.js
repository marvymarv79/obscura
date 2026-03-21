export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      DELETE FROM apt_imaging_profiles
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.status(200).json({ deleted: true, id: result[0].id });
  } catch (err) {
    console.error('Delete profile error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
