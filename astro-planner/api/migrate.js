import { db, cameras, optics, setups, locations, journalEntries, tags, journalEntryTags } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      cameras: cameraData,
      optics: opticData,
      setups: setupData,
      locations: locationData,
      imagingLog // Legacy imaging log entries to convert to journal
    } = req.body

    const results = {
      cameras: 0,
      optics: 0,
      setups: 0,
      locations: 0,
      journalEntries: 0
    }

    // Migrate cameras
    if (cameraData && Array.isArray(cameraData) && cameraData.length > 0) {
      for (const camera of cameraData) {
        if (camera.isCustom) { // Only migrate custom cameras
          await db.insert(cameras).values({
            userId,
            name: camera.name,
            sensorWidth: camera.sensorWidth || null,
            sensorHeight: camera.sensorHeight || null,
            pixelSize: camera.pixelSize || null,
            resolutionWidth: camera.resolution?.width || null,
            resolutionHeight: camera.resolution?.height || null,
            type: camera.type || null,
            isColor: camera.color !== false
          })
          results.cameras++
        }
      }
    }

    // Migrate optics
    if (opticData && Array.isArray(opticData) && opticData.length > 0) {
      for (const optic of opticData) {
        if (optic.isCustom) { // Only migrate custom optics
          await db.insert(optics).values({
            userId,
            name: optic.name,
            focalLength: optic.focalLength,
            aperture: optic.aperture || null,
            fRatio: optic.fRatio || null,
            type: optic.type || null
          })
          results.optics++
        }
      }
    }

    // Migrate setups (note: custom camera/optic references won't link to new UUIDs)
    // This creates them as standalone setups with the saved specs
    if (setupData && Array.isArray(setupData) && setupData.length > 0) {
      for (const setup of setupData) {
        if (setup.isCustom) { // Only migrate custom setups
          await db.insert(setups).values({
            userId,
            name: setup.name,
            defaultCameraId: setup.camera || null, // Store original ID as default reference
            defaultOpticId: setup.optic || null,
            focalLength: setup.focalLength,
            pixelScale: setup.pixelScale || null,
            fovWidth: setup.fov?.width || null,
            fovHeight: setup.fov?.height || null,
            category: setup.category || null
          })
          results.setups++
        }
      }
    }

    // Migrate locations
    if (locationData && Array.isArray(locationData) && locationData.length > 0) {
      for (const location of locationData) {
        await db.insert(locations).values({
          userId,
          name: location.name,
          latitude: location.lat || location.latitude,
          longitude: location.lon || location.longitude,
          isDefault: location.isDefault || false
        })
        results.locations++
      }
    }

    // Migrate imaging log entries to journal entries
    if (imagingLog && Array.isArray(imagingLog) && imagingLog.length > 0) {
      // Create a default "imaging-session" tag
      const [sessionTag] = await db.insert(tags).values({
        userId,
        name: 'imaging-session',
        color: '#3b82f6' // Blue
      }).returning()

      for (const log of imagingLog) {
        // Build content from log data
        const contentParts = []
        if (log.locationName) contentParts.push(`**Location:** ${log.locationName}`)
        if (log.targetName) contentParts.push(`**Target:** ${log.targetName}`)
        if (log.setupName) contentParts.push(`**Setup:** ${log.setupName}`)
        if (log.gearNotes) contentParts.push(`**Gear Notes:** ${log.gearNotes}`)
        if (log.totalIntegration) contentParts.push(`**Total Integration:** ${log.totalIntegration} minutes`)
        if (log.conditions) {
          const c = log.conditions
          const condParts = []
          if (c.seeing) condParts.push(`Seeing: ${c.seeing}`)
          if (c.transparency) condParts.push(`Transparency: ${c.transparency}`)
          if (c.moonPhase) condParts.push(`Moon: ${c.moonPhase} (${c.moonIllumination}%)`)
          if (condParts.length > 0) contentParts.push(`**Conditions:** ${condParts.join(', ')}`)
        }
        if (log.notes) contentParts.push(`\n${log.notes}`)

        const [entry] = await db.insert(journalEntries).values({
          userId,
          title: `Imaging Session: ${log.targetName || 'Unknown Target'}`,
          content: contentParts.join('\n\n'),
          entryDate: log.date || new Date().toISOString().split('T')[0]
        }).returning()

        // Link to session tag
        await db.insert(journalEntryTags).values({
          journalEntryId: entry.id,
          tagId: sessionTag.id
        })

        results.journalEntries++
      }
    }

    return res.status(200).json({
      message: 'Migration completed successfully',
      migrated: results
    })

  } catch (error) {
    console.error('Migration error:', error)
    return res.status(500).json({
      error: 'Migration failed',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
