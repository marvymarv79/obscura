import { db, journalEntries, journalEntryTags, tags } from '../src/db/index.js'
import { withAuth } from './_utils/auth.js'
import { eq, desc, and, ilike, gte, lte } from 'drizzle-orm'

async function handler(req, res, userId) {
  try {
    switch (req.method) {
      case 'GET': {
        const { tag, search, from, to } = req.query

        // Get all journal entries for user
        let entries = await db.select()
          .from(journalEntries)
          .where(eq(journalEntries.userId, userId))
          .orderBy(desc(journalEntries.entryDate))

        // Apply date filters
        if (from) {
          entries = entries.filter(e => e.entryDate >= from)
        }
        if (to) {
          entries = entries.filter(e => e.entryDate <= to)
        }

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase()
          entries = entries.filter(e =>
            e.title.toLowerCase().includes(searchLower) ||
            (e.content && e.content.toLowerCase().includes(searchLower))
          )
        }

        // Get tags for all entries
        const entryIds = entries.map(e => e.id)

        if (entryIds.length > 0) {
          const entryTags = await db.select({
            journalEntryId: journalEntryTags.journalEntryId,
            tagId: journalEntryTags.tagId,
            tagName: tags.name,
            tagColor: tags.color
          })
            .from(journalEntryTags)
            .innerJoin(tags, eq(journalEntryTags.tagId, tags.id))

          // Attach tags to entries
          entries = entries.map(entry => ({
            ...entry,
            tags: entryTags
              .filter(et => et.journalEntryId === entry.id)
              .map(et => ({
                id: et.tagId,
                name: et.tagName,
                color: et.tagColor
              }))
          }))

          // Filter by tag if specified
          if (tag) {
            entries = entries.filter(e =>
              e.tags.some(t => t.id === tag)
            )
          }
        } else {
          entries = entries.map(e => ({ ...e, tags: [] }))
        }

        return res.status(200).json(entries)
      }

      case 'POST': {
        const {
          title,
          content,
          entryDate,
          imagingPlanId,
          tagIds,
          newTags // Array of { name, color } for creating new tags inline
        } = req.body

        if (!title || !entryDate) {
          return res.status(400).json({ error: 'Title and entry date are required' })
        }

        // Create the journal entry
        const [newEntry] = await db.insert(journalEntries).values({
          userId,
          title,
          content: content || null,
          entryDate,
          imagingPlanId: imagingPlanId || null
        }).returning()

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
            journalEntryId: newEntry.id,
            tagId
          }))
          await db.insert(journalEntryTags).values(tagLinks)
        }

        // Fetch the entry with tags
        const entryTags = await db.select({
          tagId: journalEntryTags.tagId,
          tagName: tags.name,
          tagColor: tags.color
        })
          .from(journalEntryTags)
          .innerJoin(tags, eq(journalEntryTags.tagId, tags.id))
          .where(eq(journalEntryTags.journalEntryId, newEntry.id))

        return res.status(201).json({
          ...newEntry,
          tags: entryTags.map(t => ({
            id: t.tagId,
            name: t.tagName,
            color: t.tagColor
          }))
        })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Journal API error:', error)
    return res.status(500).json({
      error: 'Database error',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
