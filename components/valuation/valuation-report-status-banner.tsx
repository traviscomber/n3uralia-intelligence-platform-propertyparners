'use client'

import { useEffect, useState } from 'react'

type Payload = {
  valuationCase?: { status?: string }
}

const labels: Record<string, string> = {
  draft: 'BORRADOR · PRELIMINAR · NO PUBLICABLE',
  review: 'EN REVISIÓN · PRELIMINAR · NO PUBLICABLE',
  approved: 'APROBADA · PENDIENTE DE EMISIÓN',
  issued: 'VALORIZACIÓN EMITIDA',
}

export function ValuationReportStatusBanner({ valuationId }: { valuationId: string }) {
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetch(`/api/valuations/${valuationId}/comparables`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<Payload> : null)
      .then((payload) => {
        if (active) setStatus(payload?.valuationCase?.status || null)
      })
      .catch(() => {
        if (active) setStatus(null)
      })
    return () => { active = false }
  }, [valuationId])

  if (!status) return null
  const issued = status === 'issued'

  return <div
    role="status"
    className={`mb-5 border-2 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] ${issued ? 'border-emerald-800 text-emerald-900' : 'border-red-700 text-red-800'}`}
  >
    {labels[status] || status}
  </div>
}
