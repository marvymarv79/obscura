import { verifyToken } from '@clerk/backend'

/**
 * Extracts and verifies the Clerk JWT from the Authorization header.
 * Returns the userId if valid, null otherwise.
 */
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Auth failed: No Authorization header or invalid format')
    return { userId: null, error: 'missing_token' }
  }

  if (!process.env.CLERK_SECRET_KEY) {
    console.error('Auth failed: CLERK_SECRET_KEY environment variable is not set')
    return { userId: null, error: 'missing_secret_key' }
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    })
    return { userId: verified.sub, error: null }
  } catch (error) {
    console.error('Token verification failed:', error.message)
    return { userId: null, error: 'invalid_token' }
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

  const { userId, error } = await authenticateRequest(req)

  if (!userId) {
    const errorMessages = {
      missing_token: 'Authorization token is missing',
      missing_secret_key: 'Server configuration error: CLERK_SECRET_KEY not set',
      invalid_token: 'Invalid or expired token'
    }
    return res.status(401).json({
      error: 'Unauthorized',
      details: errorMessages[error] || 'Authentication failed'
    })
  }

  return handler(req, res, userId)
}
