import { neon } from '@neondatabase/serverless'

const ALLOWED_TABLES = {
  apt_cameras: ['model', 'sensor_type', 'sensor_chip', 'res_x', 'res_y', 'pixel_size_um', 'bit_depth', 'bayer_pattern', 'notes'],
  apt_optics: ['model', 'type', 'focal_length_mm', 'aperture_mm', 'focal_ratio', 'notes'],
  apt_filters: ['model', 'filter_type', 'bandpass_nm', 'bandpass_width_nm', 'transmission_pct', 'size_description', 'notes'],
  apt_filter_wheels: ['model', 'slot_count', 'compatible_filter_sizes', 'notes'],
  apt_accessories: ['model', 'category', 'reduction_factor', 'compatible_optics', 'notes'],
  apt_mounts: ['model', 'mount_type', 'payload_kg', 'notes'],
  apt_focusers: ['model', 'connection_type', 'steps_per_rotation', 'notes'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { table, fields } = req.body
    if (!table || !fields) return res.status(400).json({ error: 'Missing table or fields' })

    const allowedFields = ALLOWED_TABLES[table]
    if (!allowedFields) return res.status(400).json({ error: 'Invalid table' })

    if (!fields.model || !fields.model.trim()) {
      return res.status(400).json({ error: 'Model name is required' })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Build column/value arrays from allowed fields only
    const cols = []
    const vals = []
    for (const key of allowedFields) {
      if (fields[key] !== undefined && fields[key] !== '') {
        cols.push(key)
        vals.push(fields[key])
      }
    }

    if (cols.length === 0) return res.status(400).json({ error: 'No valid fields provided' })

    // Use dynamic column insertion
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
    const query = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
    const [created] = await sql(query, vals)

    return res.status(201).json(created)
  } catch (error) {
    console.error('[api/apertura/items/add] Error', { message: error.message })
    return res.status(500).json({ error: error.message })
  }
}
