import { db, tags } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        const userTags = await db.select()
          .from(tags)
          .where(eq(tags.userId, userId))
          .orderBy(tags.name)

        return res.status(200).json(userTags)
      }

      case 'POST': {
        const { name, color } = req.body

        if (!name) {
          return res.status(400).json({ error: 'Tag name is required' })
        }

        // Check for duplicate tag name
        const existing = await db.select()
          .from(tags)
          .where(eq(tags.userId, userId))

        if (existing.some(t => t.name.toLowerCase() === name.toLowerCase())) {
          return res.status(409).json({ error: 'Tag with this name already exists' })
        }

        const [newTag] = await db.insert(tags).values({
          userId,
          name,
          color: color || null
        }).returning()

        return res.status(201).json(newTag)
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Tags API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
