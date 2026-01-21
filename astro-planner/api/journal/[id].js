import { db, journalEntries, journalEntryTags, tags } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Journal entry ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        const [entry] = await db.select()
          .from(journalEntries)
          .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
          .limit(1)

        if (!entry) {
          return res.status(404).json({ error: 'Journal entry not found' })
        }

        // Get tags
        const entryTags = await db.select({
          tagId: journalEntryTags.tagId,
          tagName: tags.name,
          tagColor: tags.color
        })
          .from(journalEntryTags)
          .innerJoin(tags, eq(journalEntryTags.tagId, tags.id))
          .where(eq(journalEntryTags.journalEntryId, id))

        return res.status(200).json({
          ...entry,
          tags: entryTags.map(t => ({
            id: t.tagId,
            name: t.tagName,
            color: t.tagColor
          }))
        })
      }

      case 'PUT': {
        const {
          title,
          content,
          entryDate,
          imagingPlanId,
          tagIds,
          newTags
        } = req.body

        const [updated] = await db.update(journalEntries)
          .set({
            title,
            content,
            entryDate,
            imagingPlanId,
            updatedAt: new Date()
          })
          .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
          .returning()

        if (!updated) {
          return res.status(404).json({ error: 'Journal entry not found' })
        }

        // Update tags if provided
        if (tagIds !== undefined || newTags !== undefined) {
          // Remove existing tag links
          await db.delete(journalEntryTags)
            .where(eq(journalEntryTags.journalEntryId, id))

          const allTagIds = [...(tagIds || [])]

          // Create new tags if provided
          if (newTags && Array.isArray(newTags) && newTags.length > 0) {
            for (const newTag of newTags) {
              if (newTag.name) {
                const [created] = await db.insert(tags).values({
                  userId,
                  name: newTag.name,
                  color: newTag.color || null
                }).returning()
                allTagIds.push(created.id)
              }
            }
          }

          // Link tags to entry
          if (allTagIds.length > 0) {
            const tagLinks = allTagIds.map(tagId => ({
              journalEntryId: id,
              tagId
            }))
            await db.insert(journalEntryTags).values(tagLinks)
          }
        }

        // Fetch updated entry with tags
        const entryTags = await db.select({
          tagId: journalEntryTags.tagId,
          tagName: tags.name,
          tagColor: tags.color
        })
          .from(journalEntryTags)
          .innerJoin(tags, eq(journalEntryTags.tagId, tags.id))
          .where(eq(journalEntryTags.journalEntryId, id))

        return res.status(200).json({
          ...updated,
          tags: entryTags.map(t => ({
            id: t.tagId,
            name: t.tagName,
            color: t.tagColor
          }))
        })
      }

      case 'DELETE': {
        const [deleted] = await db.delete(journalEntries)
          .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
          .returning()

        if (!deleted) {
          return res.status(404).json({ error: 'Journal entry not found' })
        }

        return res.status(200).json({ message: 'Journal entry deleted', id })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Journal entry API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
