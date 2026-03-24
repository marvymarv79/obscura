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

    if (response.status === 401 || response.status === 403) {
      console.warn('[useApi] Auth failure', { status: response.status, url, method: options.method || 'GET' })
    }

    if (!response.ok) {
      const text = await response.text()
      let message = `Request failed (${response.status})`
      try {
        const parsed = JSON.parse(text)
        message = parsed.details || parsed.error || message
      } catch (e) {
        console.error('[useApi] Failed to parse response as JSON', { url, status: response.status, error: e.message })
      }
      throw new Error(message)
    }

    const text = await response.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch (e) {
      console.error('[useApi] Failed to parse response as JSON', { url, status: response.status, error: e.message })
      throw new Error('Invalid JSON response from server')
    }
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
