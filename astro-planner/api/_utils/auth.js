import { verifyToken } from '@clerk/backend'

/**
 * Extracts and verifies the Clerk JWT from the Authorization header.
 * Returns the userId if valid, null otherwise.
 */
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    })
    return verified.sub // This is the Clerk userId
  } catch (error) {
    console.error('Token verification failed:', error.message)
    return null
  }
}

/**
 * Standard CORS headers for API responses
 */
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * Handle preflight OPTIONS request
 */
export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res)
    res.status(200).end()
    return true
  }
  return false
}

/**
 * Wrapper for protected API routes.
 * Returns 401 if not authenticated.
 */
export async function withAuth(req, res, handler) {
  setCorsHeaders(res)

  if (handleOptions(req, res)) return

  const userId = await authenticateRequest(req)

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  return handler(req, res, userId)
}
