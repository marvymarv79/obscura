export default async function handler(req, res) {
  console.log('=== PROFILE [ID] HANDLER CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', JSON.stringify(req.query));
  console.log('Headers:', JSON.stringify(req.headers));

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return res.status(200).end();
  }

  const { id } = req.query;
  console.log('Extracted id:', id);

  if (!id) {
    console.log('ERROR: Missing id');
    return res.status(400).json({ error: 'Missing id' });
  }

  if (req.method === 'DELETE') {
    console.log('Handling DELETE for id:', id);
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      console.log('Executing DELETE query for id:', parseInt(id));
      const result = await sql`
        DELETE FROM apt_imaging_profiles
        WHERE id = ${parseInt(id)}
        RETURNING id
      `;
      console.log('Delete result:', JSON.stringify(result));
      if (result.length === 0) {
        console.log('Profile not found for id:', id);
        return res.status(404).json({ error: 'Profile not found' });
      }
      console.log('Successfully deleted profile:', result[0].id);
      return res.status(200).json({
        deleted: true,
        id: result[0].id
      });
    } catch (err) {
      console.error('Delete error:', err.message);
      console.error('Stack:', err.stack);
      return res.status(500).json({ error: err.message });
    }
  }

  console.log('Method not allowed:', req.method);
  return res.status(405).json({
    error: 'Method not allowed',
    receivedMethod: req.method,
    allowedMethods: ['DELETE', 'OPTIONS']
  });
}
