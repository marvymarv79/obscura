import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

/**
 * Hook for making authenticated API calls using Clerk tokens
 */
export function useApi() {
  const { getToken, isSignedIn } = useAuth()

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    if (!isSignedIn) {
      throw new Error('Not authenticated')
    }

    const token = await getToken()

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || error.details || 'Request failed')
    }

    return response.json()
  }, [getToken, isSignedIn])

  const get = useCallback((url) => fetchWithAuth(url), [fetchWithAuth])

  const post = useCallback((url, data) => fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }), [fetchWithAuth])

  const put = useCallback((url, data) => fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  }), [fetchWithAuth])

  const del = useCallback((url) => fetchWithAuth(url, {
    method: 'DELETE'
  }), [fetchWithAuth])

  return { get, post, put, del, isSignedIn }
}
