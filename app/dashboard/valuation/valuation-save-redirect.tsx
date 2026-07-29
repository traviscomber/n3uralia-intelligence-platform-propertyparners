'use client'

import { useEffect } from 'react'

export function ValuationSaveRedirect() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init)
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()

      if (url.includes('/api/valuation/cases') && method === 'POST' && response.ok) {
        try {
          const payload = await response.clone().json() as { caseId?: string }
          if (payload.caseId) {
            window.location.assign(`/dashboard/valuations/${encodeURIComponent(payload.caseId)}`)
          }
        } catch {
          // The page keeps its native success/error handling when the response is not JSON.
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
