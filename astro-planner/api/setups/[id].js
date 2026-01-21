import { db, setups } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Setup ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        const [setup] = await db.select()
          .from(setups)
          .where(and(eq(setups.id, id), eq(setups.userId, userId)))
          .limit(1)

        if (!setup) {
          return res.status(404).json({ error: 'Setup not found' })
        }

        return res.status(200).json(setup)
      }

      case 'PUT': {
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

        const [updated] = await db.update(setups)
          .set({
            name,
            cameraId,
            opticId,
            defaultCameraId,
            defaultOpticId,
            focalLength,
            pixelScale,
            fovWidth,
            fovHeight,
            category,
            updatedAt: new Date()
          })
          .where(and(eq(setups.id, id), eq(setups.userId, userId)))
          .returning()

        if (!updated) {
          return res.status(404).json({ error: 'Setup not found' })
        }

        return res.status(200).json(updated)
      }

      case 'DELETE': {
        const [deleted] = await db.delete(setups)
          .where(and(eq(setups.id, id), eq(setups.userId, userId)))
          .returning()

        if (!deleted) {
          return res.status(404).json({ error: 'Setup not found' })
        }

        return res.status(200).json({ message: 'Setup deleted', id })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Setup API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
