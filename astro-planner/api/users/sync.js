import { db, users } from '../../src/db/index.js'
import { withAuth } from '../_utils/auth.js'
import { eq } from 'drizzle-orm'

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body || {}

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users)
        .set({
          email: email || existingUser[0].email,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))

      return res.status(200).json({
        message: 'User updated',
        userId,
        isNew: false
      })
    }

    // Create new user
    await db.insert(users).values({
      id: userId,
      email: email || null
    })

    return res.status(201).json({
      message: 'User created',
      userId,
      isNew: true
    })

  } catch (error) {
    console.error('User sync error:', error)
    return res.status(500).json({
      error: 'Failed to sync user',
      details: error.message
    })
  }
}

export default function (req, res) {
  return withAuth(req, res, handler)
}
