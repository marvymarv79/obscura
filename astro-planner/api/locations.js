import { db, locations } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        const userLocations = await db.select()
          .from(locations)
          .where(eq(locations.userId, userId))
          .orderBy(locations.name)

        return res.status(200).json(userLocations)
      }

      case 'POST': {
        const { name, latitude, longitude, isDefault } = req.body

        if (!name || latitude === undefined || longitude === undefined) {
          return res.status(400).json({ error: 'Name, latitude, and longitude are required' })
        }

        // If setting as default, clear other defaults first
        if (isDefault) {
          await db.update(locations)
            .set({ isDefault: false })
            .where(eq(locations.userId, userId))
        }

        const [newLocation] = await db.insert(locations).values({
          userId,
          name,
          latitude,
          longitude,
          isDefault: isDefault || false
        }).returning()

        return res.status(201).json(newLocation)
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Locations API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
