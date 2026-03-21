import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)

  if (req.method === 'GET') {
    try {
      // Join profiles with all related tables + computed view
      const rows = await sql`
        SELECT
          p.id, p.profile_name, p.notes,
          p.camera_id, p.optics_id, p.reducer_flattener_id,
          p.filter_wheel_id, p.filter_set_id, p.focuser_id, p.mount_id,
          c.model AS camera_model, c.sensor_type, c.pixel_size_um AS camera_pixel_size,
          c.res_x AS camera_res_x, c.res_y AS camera_res_y,
          c.bit_depth, c.bayer_pattern, c.notes AS camera_notes,
          o.model AS optics_model, o.focal_length_mm, o.aperture_mm, o.focal_ratio,
          a.model AS reducer_model, a.reduction_factor,
          fw.model AS filter_wheel_model, fw.slot_count,
          fs.set_name AS filter_set_name,
          f.model AS focuser_model, f.steps_per_rotation AS focuser_steps,
          m.model AS mount_model,
          v.effective_fl, v.arcsec_per_pixel, v.fov_width_deg, v.fov_height_deg
        FROM apt_imaging_profiles p
        LEFT JOIN apt_cameras c ON p.camera_id = c.id
        LEFT JOIN apt_optics o ON p.optics_id = o.id
        LEFT JOIN apt_accessories a ON p.reducer_flattener_id = a.id
        LEFT JOIN apt_filter_wheels fw ON p.filter_wheel_id = fw.id
        LEFT JOIN apt_filter_sets fs ON p.filter_set_id = fs.id
        LEFT JOIN apt_focusers f ON p.focuser_id = f.id
        LEFT JOIN apt_mounts m ON p.mount_id = m.id
        LEFT JOIN v_apt_profile_specs v ON p.id = v.profile_id
        ORDER BY p.id
      `
      return res.status(200).json(rows)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Missing profile id' })
    }
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return res.status(400).json({ error: 'Invalid profile id', received: id })
    }
    try {
      const result = await sql`
        DELETE FROM apt_imaging_profiles WHERE id = ${numId} RETURNING id
      `
      if (result.length === 0) {
        return res.status(404).json({ error: 'Profile not found', id: numId })
      }
      return res.status(200).json({ deleted: result[0].id })
    } catch (error) {
      console.error('Delete profile error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { profile_name, camera_id, optics_id, reducer_flattener_id,
              filter_wheel_id, filter_set_id, focuser_id, mount_id, notes } = req.body
      if (!profile_name) {
        return res.status(400).json({ error: 'profile_name is required' })
      }
      const result = await sql`
        INSERT INTO apt_imaging_profiles
          (profile_name, camera_id, optics_id, reducer_flattener_id,
           filter_wheel_id, filter_set_id, focuser_id, mount_id, notes)
        VALUES
          (${profile_name}, ${camera_id || null}, ${optics_id || null},
           ${reducer_flattener_id || null}, ${filter_wheel_id || null},
           ${filter_set_id || null}, ${focuser_id || null}, ${mount_id || null},
           ${notes || null})
        RETURNING *
      `
      return res.status(201).json(result[0])
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
