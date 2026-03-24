import { db, imagingPlans, journalEntries } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq, and } from 'drizzle-orm'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { planId, journalEntryId } = req.body
    if (!planId || !journalEntryId) {
      return res.status(400).json({ error: 'Missing planId or journalEntryId' })
    }

    // Set journal_entry_id on the plan
    await db.update(imagingPlans)
      .set({ journalEntryId, updatedAt: new Date() })
      .where(and(eq(imagingPlans.id, planId), eq(imagingPlans.userId, userId)))

    // Set plan_id on the journal entry
    await db.update(journalEntries)
      .set({ planId, updatedAt: new Date() })
      .where(and(eq(journalEntries.id, journalEntryId), eq(journalEntries.userId, userId)))

    return res.status(200).json({ success: true, planId, journalEntryId })
  } catch (error) {
    console.error('Link journal error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
