import { db, optics } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Optic ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        const [optic] = await db.select()
          .from(optics)
          .where(and(eq(optics.id, id), eq(optics.userId, userId)))
          .limit(1)

        if (!optic) {
          return res.status(404).json({ error: 'Optic not found' })
        }

        return res.status(200).json(optic)
      }

      case 'PUT': {
        const { name, focalLength, aperture, fRatio, type } = req.body

        const [updated] = await db.update(optics)
          .set({
            name,
            focalLength,
            aperture,
            fRatio,
            type,
            updatedAt: new Date()
          })
          .where(and(eq(optics.id, id), eq(optics.userId, userId)))
          .returning()

        if (!updated) {
          return res.status(404).json({ error: 'Optic not found' })
        }

        return res.status(200).json(updated)
      }

      case 'DELETE': {
        const [deleted] = await db.delete(optics)
          .where(and(eq(optics.id, id), eq(optics.userId, userId)))
          .returning()

        if (!deleted) {
          return res.status(404).json({ error: 'Optic not found' })
        }

        return res.status(200).json({ message: 'Optic deleted', id })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Optic API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
