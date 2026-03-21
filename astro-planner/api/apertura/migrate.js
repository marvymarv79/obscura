import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const setupKey = req.headers['x-setup-key']
  if (!setupKey || setupKey !== process.env.DB_SETUP_KEY) {
    return res.status(403).json({ error: 'Forbidden — invalid or missing X-Setup-Key' })
  }

  const sql = neon(process.env.DATABASE_URL)
  const results = {}

  try {
    // 1. Delete all existing imaging profiles
    const deleted = await sql`DELETE FROM apt_imaging_profiles RETURNING id`
    results.profiles_deleted = deleted.length

    // 2. Ensure unique indexes exist for ON CONFLICT
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS apt_cameras_model_idx ON apt_cameras (model)`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS apt_optics_model_idx ON apt_optics (model)`

    // 3. Insert Nikon Z6III
    const camResult = await sql`
      INSERT INTO apt_cameras (model, sensor_type, sensor_chip, res_x, res_y, pixel_size_um, bit_depth, bayer_pattern, notes)
      VALUES ('Nikon Z6III', 'OSC', 'Sony IMX410', 6048, 4024, 3.45, 14, 'RGGB', 'Stock (unmodified). NINA export not supported — use for FOV planning only.')
      ON CONFLICT (model) DO NOTHING
      RETURNING id
    `
    results.z6iii_inserted = camResult.length > 0

    // 4. Insert Nikon 20mm f/1.8 S
    const optResult = await sql`
      INSERT INTO apt_optics (model, focal_length_mm, aperture_mm, focal_ratio, type, notes)
      VALUES ('Nikon 20mm f/1.8 S', 20, 26, 1.8, 'Camera Lens', 'Nikon Z mount. Pairs with Nikon Z6III only.')
      ON CONFLICT (model) DO NOTHING
      RETURNING id
    `
    results.nikon20mm_inserted = optResult.length > 0

    return res.status(200).json({ success: true, message: 'Migration complete', results })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
