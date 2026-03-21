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
  const results = { tables: [], view: null, seeded: {} }

  try {
    // ── CREATE TABLES ──────────────────────────────────────────────
    // Prefixed with apt_ to avoid collisions with existing Drizzle-managed
    // Obscura tables (cameras, optics) which have different schemas.

    await sql`
      CREATE TABLE IF NOT EXISTS apt_cameras (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        sensor_chip TEXT,
        res_x INTEGER,
        res_y INTEGER,
        pixel_size_um NUMERIC(5,2),
        bit_depth INTEGER,
        bayer_pattern TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_cameras')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_optics (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        focal_length_mm NUMERIC(7,2),
        aperture_mm NUMERIC(6,2),
        focal_ratio NUMERIC(5,2),
        type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_optics')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_accessories (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        category TEXT,
        reduction_factor NUMERIC(4,3),
        thread_connection TEXT,
        compatible_optics TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_accessories')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_filters (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        filter_type TEXT NOT NULL,
        size_description TEXT,
        bandpass_nm NUMERIC(6,2),
        bandpass_width_nm NUMERIC(5,2),
        transmission_pct NUMERIC(5,2),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_filters')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_filter_sets (
        id SERIAL PRIMARY KEY,
        set_name TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_filter_sets')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_filter_set_members (
        set_id INTEGER REFERENCES apt_filter_sets(id) ON DELETE CASCADE,
        filter_id INTEGER REFERENCES apt_filters(id) ON DELETE CASCADE,
        slot_number INTEGER,
        PRIMARY KEY (set_id, filter_id)
      )
    `
    results.tables.push('apt_filter_set_members')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_filter_wheels (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        slot_count INTEGER,
        compatible_filter_sizes TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_filter_wheels')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_mounts (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        mount_type TEXT,
        payload_kg NUMERIC(5,2),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_mounts')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_focusers (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        steps_per_rotation INTEGER,
        travel_range_mm NUMERIC(6,2),
        connection_type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_focusers')

    await sql`
      CREATE TABLE IF NOT EXISTS apt_imaging_profiles (
        id SERIAL PRIMARY KEY,
        profile_name TEXT NOT NULL,
        camera_id INTEGER REFERENCES apt_cameras(id),
        optics_id INTEGER REFERENCES apt_optics(id),
        reducer_flattener_id INTEGER REFERENCES apt_accessories(id),
        filter_wheel_id INTEGER REFERENCES apt_filter_wheels(id),
        filter_set_id INTEGER REFERENCES apt_filter_sets(id),
        focuser_id INTEGER REFERENCES apt_focusers(id),
        mount_id INTEGER REFERENCES apt_mounts(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.tables.push('apt_imaging_profiles')

    // ── CREATE VIEW ────────────────────────────────────────────────

    await sql`
      CREATE OR REPLACE VIEW v_apt_profile_specs AS
      SELECT
        p.id AS profile_id,
        p.profile_name,
        c.model AS camera,
        c.sensor_type,
        c.res_x,
        c.res_y,
        c.pixel_size_um,
        o.model AS scope,
        (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)) AS effective_fl,
        ((c.pixel_size_um * 206.265) /
          (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
          AS arcsec_per_pixel,
        ((c.res_x * c.pixel_size_um / 1000.0) * 57.3 /
          (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
          AS fov_width_deg,
        ((c.res_y * c.pixel_size_um / 1000.0) * 57.3 /
          (o.focal_length_mm * COALESCE(a.reduction_factor, 1.0)))
          AS fov_height_deg
      FROM apt_imaging_profiles p
      JOIN apt_cameras c ON p.camera_id = c.id
      JOIN apt_optics o ON p.optics_id = o.id
      LEFT JOIN apt_accessories a ON p.reducer_flattener_id = a.id
    `
    results.view = 'v_apt_profile_specs'

    // ── SEED DATA ──────────────────────────────────────────────────

    // Cameras
    const cameraRows = await sql`
      INSERT INTO apt_cameras (model, sensor_type, sensor_chip, res_x, res_y, pixel_size_um, bit_depth, bayer_pattern, notes)
      VALUES
        ('ZWO ASI533MC Pro', 'OSC', 'Sony IMX533', 3008, 3008, 3.76, 14, 'RGGB', NULL),
        ('ZWO ASI2600MM Pro (2025)', 'Mono', 'Sony IMX571', 6248, 4176, 3.76, 16, NULL, NULL),
        ('ZWO ASI220MM Mini', 'Mono', 'Sony IMX220', 1920, 1080, 4.0, 12, NULL, 'Guide camera'),
        ('ZWO Seestar S50 (integrated)', 'OSC', 'Sony IMX462', 1920, 1080, 2.9, 12, 'RGGB', 'Integrated in Seestar S50 all-in-one')
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.cameras = cameraRows.length

    // Optics
    const opticsRows = await sql`
      INSERT INTO apt_optics (model, focal_length_mm, aperture_mm, focal_ratio, type, notes)
      VALUES
        ('Sky-Watcher Evostar 72ED', 420, 72, 5.8, 'Refractor', NULL),
        ('Askar V 60mm', 360, 60, 6.0, 'Refractor', 'Part of Askar V modular system'),
        ('Askar V 80mm', 500, 80, 6.25, 'Refractor', 'Part of Askar V modular system'),
        ('William Optics UniGuide 32mm', 120, 32, 3.75, 'Guide Scope', NULL),
        ('Askar 52mm Guide Scope', 208, 52, 4.0, 'Guide Scope', NULL)
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.optics = opticsRows.length

    // Accessories
    const accessoryRows = await sql`
      INSERT INTO apt_accessories (model, category, reduction_factor, thread_connection, compatible_optics, notes)
      VALUES
        ('Sky-Watcher 0.85x Reducer/Flattener for Evostar 72ED', 'Reducer', 0.85, 'M48x0.75 camera side', 'Sky-Watcher Evostar 72ED', 'Reduces to f/4.93, 420mm to 357mm')
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.accessories = accessoryRows.length

    // Filters
    const filterRows = await sql`
      INSERT INTO apt_filters (model, filter_type, size_description, bandpass_nm, bandpass_width_nm, transmission_pct, notes)
      VALUES
        ('Antlia V-Series Luminance Pro', 'L', '2" mounted', NULL, NULL, NULL, NULL),
        ('Antlia V-Series Red Pro', 'R', '2" mounted', NULL, NULL, NULL, NULL),
        ('Antlia V-Series Green Pro', 'G', '2" mounted', NULL, NULL, NULL, NULL),
        ('Antlia V-Series Blue Pro', 'B', '2" mounted', NULL, NULL, NULL, NULL),
        ('Antlia 3nm H-Alpha Pro', 'Ha', '2" mounted', 656.3, 3.0, 87.5, NULL),
        ('Antlia 3nm SII Pro', 'SII', '2" mounted', 671.6, 3.0, 90.0, NULL),
        ('Antlia 3nm OIII Pro', 'OIII', '2" mounted', 500.7, 3.0, 87.5, NULL),
        ('Astronomik CLS Clip', 'CLS', 'Nikon Z XL clip-in', NULL, NULL, NULL, 'Broadband light pollution filter')
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.filters = filterRows.length

    // Filter Sets
    const filterSetRows = await sql`
      INSERT INTO apt_filter_sets (set_name, notes)
      VALUES ('Antlia LRGB + NB Set', NULL)
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.filter_sets = filterSetRows.length

    // Filter Set Members
    if (filterSetRows.length > 0) {
      const setId = filterSetRows[0].id
      const allFilters = await sql`
        SELECT id, filter_type FROM apt_filters
        WHERE filter_type IN ('L', 'R', 'G', 'B', 'Ha', 'SII', 'OIII')
        ORDER BY
          CASE filter_type
            WHEN 'L' THEN 1 WHEN 'R' THEN 2 WHEN 'G' THEN 3
            WHEN 'B' THEN 4 WHEN 'Ha' THEN 5 WHEN 'SII' THEN 6
            WHEN 'OIII' THEN 7
          END
      `
      let membersInserted = 0
      for (let i = 0; i < allFilters.length; i++) {
        const inserted = await sql`
          INSERT INTO apt_filter_set_members (set_id, filter_id, slot_number)
          VALUES (${setId}, ${allFilters[i].id}, ${i + 1})
          ON CONFLICT DO NOTHING
          RETURNING set_id
        `
        membersInserted += inserted.length
      }
      results.seeded.filter_set_members = membersInserted
    }

    // Filter Wheels
    const fwRows = await sql`
      INSERT INTO apt_filter_wheels (model, slot_count, compatible_filter_sizes, notes)
      VALUES ('ZWO 7-Position EFW 2" (2025)', 7, '2" (50.8mm) threaded / 50.4mm unmounted', NULL)
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.filter_wheels = fwRows.length

    // Mounts
    const mountRows = await sql`
      INSERT INTO apt_mounts (model, mount_type, payload_kg, notes)
      VALUES ('Sky-Watcher EQ-AL55i Pro', 'EQ GoTo', 10.0, NULL)
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.mounts = mountRows.length

    // Focusers
    const focuserRows = await sql`
      INSERT INTO apt_focusers (model, steps_per_rotation, connection_type, notes)
      VALUES ('ZWO EAF (2025)', 5760, 'USB-C', NULL)
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.focusers = focuserRows.length

    // Imaging Profiles — look up IDs by model name
    const [cam533] = await sql`SELECT id FROM apt_cameras WHERE model = 'ZWO ASI533MC Pro' LIMIT 1`
    const [cam2600] = await sql`SELECT id FROM apt_cameras WHERE model = 'ZWO ASI2600MM Pro (2025)' LIMIT 1`
    const [evostar] = await sql`SELECT id FROM apt_optics WHERE model = 'Sky-Watcher Evostar 72ED' LIMIT 1`
    const [askarV60] = await sql`SELECT id FROM apt_optics WHERE model = 'Askar V 60mm' LIMIT 1`
    const [reducer] = await sql`SELECT id FROM apt_accessories WHERE model LIKE 'Sky-Watcher 0.85x%' LIMIT 1`
    const [efw] = await sql`SELECT id FROM apt_filter_wheels WHERE model LIKE 'ZWO 7-Position%' LIMIT 1`
    const [filterSet] = await sql`SELECT id FROM apt_filter_sets WHERE set_name = 'Antlia LRGB + NB Set' LIMIT 1`
    const [mount] = await sql`SELECT id FROM apt_mounts WHERE model = 'Sky-Watcher EQ-AL55i Pro' LIMIT 1`
    const [focuser] = await sql`SELECT id FROM apt_focusers WHERE model = 'ZWO EAF (2025)' LIMIT 1`

    const profileRows = await sql`
      INSERT INTO apt_imaging_profiles (profile_name, camera_id, optics_id, reducer_flattener_id, filter_wheel_id, filter_set_id, focuser_id, mount_id, notes)
      VALUES
        ('Evostar 72 + 533MC (Widefield OSC)',
          ${cam533?.id ?? null}, ${evostar?.id ?? null}, ${reducer?.id ?? null},
          NULL, NULL, ${focuser?.id ?? null}, ${mount?.id ?? null}, NULL),
        ('Evostar 72 + 2600MM (Widefield Mono)',
          ${cam2600?.id ?? null}, ${evostar?.id ?? null}, ${reducer?.id ?? null},
          ${efw?.id ?? null}, ${filterSet?.id ?? null}, ${focuser?.id ?? null}, ${mount?.id ?? null}, NULL),
        ('Askar V 60 + 533MC (Ultra-wide OSC)',
          ${cam533?.id ?? null}, ${askarV60?.id ?? null}, NULL,
          NULL, NULL, ${focuser?.id ?? null}, ${mount?.id ?? null}, NULL)
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    results.seeded.imaging_profiles = profileRows.length

    return res.status(200).json({
      success: true,
      message: 'Apertura schema created and seeded',
      results
    })

  } catch (error) {
    console.error('db-setup error:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
