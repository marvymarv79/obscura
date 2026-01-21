import { db, setups } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        const userSetups = await db.select()
          .from(setups)
          .where(eq(setups.userId, userId))
          .orderBy(setups.name)

        return res.status(200).json(userSetups)
      }

      case 'POST': {
        const {
          name,
          cameraId,
          opticId,
          defaultCameraId,
          defaultOpticId,
          focalLength,
          pixelScale,
          fovWidth,
          fovHeight,
          category
        } = req.body

        if (!name || !focalLength) {
          return res.status(400).json({ error: 'Name and focal length are required' })
        }

        const [newSetup] = await db.insert(setups).values({
          userId,
          name,
          cameraId: cameraId || null,
          opticId: opticId || null,
          defaultCameraId: defaultCameraId || null,
          defaultOpticId: defaultOpticId || null,
          focalLength,
          pixelScale: pixelScale || null,
          fovWidth: fovWidth || null,
          fovHeight: fovHeight || null,
          category: category || null
        }).returning()

        return res.status(201).json(newSetup)
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Setups API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
