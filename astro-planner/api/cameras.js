import { db, cameras } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        const userCameras = await db.select()
          .from(cameras)
          .where(eq(cameras.userId, userId))
          .orderBy(cameras.name)

        return res.status(200).json(userCameras)
      }

      case 'POST': {
        const { name, sensorWidth, sensorHeight, pixelSize, resolutionWidth, resolutionHeight, type, isColor } = req.body

        if (!name) {
          return res.status(400).json({ error: 'Camera name is required' })
        }

        const [newCamera] = await db.insert(cameras).values({
          userId,
          name,
          sensorWidth: sensorWidth || null,
          sensorHeight: sensorHeight || null,
          pixelSize: pixelSize || null,
          resolutionWidth: resolutionWidth || null,
          resolutionHeight: resolutionHeight || null,
          type: type || null,
          isColor: isColor !== undefined ? isColor : true
        }).returning()

        return res.status(201).json(newCamera)
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Cameras API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
