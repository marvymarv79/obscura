import { db, tags } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Tag ID is required' })
  }

  try {
    switch (req.method) {
      case 'PUT': {
        const { name, color } = req.body

        if (!name) {
          return res.status(400).json({ error: 'Tag name is required' })
        }

        const [updated] = await db.update(tags)
          .set({
            name,
            color: color || null
          })
          .where(and(eq(tags.id, id), eq(tags.userId, userId)))
          .returning()

        if (!updated) {
          return res.status(404).json({ error: 'Tag not found' })
        }

        return res.status(200).json(updated)
      }

      case 'DELETE': {
        const [deleted] = await db.delete(tags)
          .where(and(eq(tags.id, id), eq(tags.userId, userId)))
          .returning()

        if (!deleted) {
          return res.status(404).json({ error: 'Tag not found' })
        }

        return res.status(200).json({ message: 'Tag deleted', id })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Tag API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
