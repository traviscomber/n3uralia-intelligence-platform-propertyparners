'use client'

import { useEffect } from 'react'

export function ValuationSaveRedirect() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    const alignCreatorActions = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      const reviewButton = buttons.find((button) => button.textContent?.includes('Enviar a revisión'))
      if (reviewButton) {
        reviewButton.disabled = true
        reviewButton.hidden = true
        reviewButton.setAttribute('aria-hidden', 'true')
        reviewButton.title = 'La revisión se solicita desde el expediente guardado.'
      }

      const saveButton = buttons.find((button) => button.textContent?.includes('Guardar borrador'))
      if (saveButton) saveButton.title = 'Guarda el borrador y abre su expediente trazable.'
    }

    alignCreatorActions()
    const observer = new MutationObserver(alignCreatorActions)
    observer.observe(document.body, { childList: true, subtree: true })

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
          // Preserve the page's native error handling if the response cannot be parsed.
        }
      }

      return response
    }

    return () => {
      observer.disconnect()
      window.fetch = originalFetch
    }
  }, [])

  return null
}
