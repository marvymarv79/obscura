import { db, optics } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        const userOptics = await db.select()
          .from(optics)
          .where(eq(optics.userId, userId))
          .orderBy(optics.name)

        return res.status(200).json(userOptics)
      }

      case 'POST': {
        const { name, focalLength, aperture, fRatio, type } = req.body

        if (!name || !focalLength) {
          return res.status(400).json({ error: 'Name and focal length are required' })
        }

        const [newOptic] = await db.insert(optics).values({
          userId,
          name,
          focalLength,
          aperture: aperture || null,
          fRatio: fRatio || null,
          type: type || null
        }).returning()

        return res.status(201).json(newOptic)
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Optics API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
