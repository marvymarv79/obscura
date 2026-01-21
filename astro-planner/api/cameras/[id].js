import { db, cameras } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Camera ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        const [camera] = await db.select()
          .from(cameras)
          .where(and(eq(cameras.id, id), eq(cameras.userId, userId)))
          .limit(1)

        if (!camera) {
          return res.status(404).json({ error: 'Camera not found' })
        }

        return res.status(200).json(camera)
      }

      case 'PUT': {
        const { name, sensorWidth, sensorHeight, pixelSize, resolutionWidth, resolutionHeight, type, isColor } = req.body

        const [updated] = await db.update(cameras)
          .set({
            name,
            sensorWidth,
            sensorHeight,
            pixelSize,
            resolutionWidth,
            resolutionHeight,
            type,
            isColor,
            updatedAt: new Date()
          })
          .where(and(eq(cameras.id, id), eq(cameras.userId, userId)))
          .returning()

        if (!updated) {
          return res.status(404).json({ error: 'Camera not found' })
        }

        return res.status(200).json(updated)
      }

      case 'DELETE': {
        const [deleted] = await db.delete(cameras)
          .where(and(eq(cameras.id, id), eq(cameras.userId, userId)))
          .returning()

        if (!deleted) {
          return res.status(404).json({ error: 'Camera not found' })
        }

        return res.status(200).json({ message: 'Camera deleted', id })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Camera API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
