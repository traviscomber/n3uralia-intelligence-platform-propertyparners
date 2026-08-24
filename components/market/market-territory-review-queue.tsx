'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketHouseTerritoryQueueItem } from '@/lib/market-house-intelligence'

export function MarketTerritoryReviewQueue({ rows }: { rows: MarketHouseTerritoryQueueItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(rows.filter((row) => row.reviewStatus === 'suggested'))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function review(item: MarketHouseTerritoryQueueItem, decision: 'accepted' | 'rejected') {
    if (!item.suggestedNeighborhoodId) return
    const itemId = `${item.sourceId}:${item.sourceListingId}`
    setBusyId(itemId)
    setMessage('')

    const response = await fetch('/api/market/territory-review', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceId: item.sourceId,
        sourceListingId: item.sourceListingId,
        neighborhoodId: item.suggestedNeighborhoodId,
        decision,
      }),
    })
    const data = await response.json().catch(() => ({}))

    if (response.status === 403 && data.error === 'MFA_REQUIRED') {
      window.location.href = `/auth/mfa?next=${encodeURIComponent('/dashboard/market/reconciliacion')}`
      return
    }
    if (!response.ok) {
      setMessage(data.error || 'No fue posible guardar la revisión.')
      setBusyId(null)
      return
    }

    setItems((current) => current.filter((row) => `${row.sourceId}:${row.sourceListingId}` !== itemId))
    setBusyId(null)
    router.refresh()
  }

  if (items.length === 0) {
    return <p className="border-y border-[var(--n3-line)] py-5 text-sm text-[var(--n3-text-muted)]">Sin sugerencias pendientes.</p>
  }

  return (
    <div>
      <div className="divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">
        {items.map((item) => {
          const itemId = `${item.sourceId}:${item.sourceListingId}`
          const busy = busyId === itemId
          return (
            <article key={itemId} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--n3-text-light)]">{item.listingAddress}</p>
                {item.listingUrl ? <a href={item.listingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[var(--n3-accent)]">Abrir aviso</a> : null}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio sugerido</p>
                <p className="mt-1 text-sm font-semibold">{item.suggestedNeighborhoodName}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={Boolean(busyId)} onClick={() => void review(item, 'accepted')} className="min-h-10 bg-[var(--primary)] px-4 text-xs font-semibold text-white disabled:opacity-40">
                  {busy ? 'Guardando…' : 'Aceptar'}
                </button>
                <button type="button" disabled={Boolean(busyId)} onClick={() => void review(item, 'rejected')} className="min-h-10 border border-[var(--n3-line)] px-3 text-xs font-semibold text-[var(--n3-text-muted)] disabled:opacity-40">
                  Descartar
                </button>
              </div>
            </article>
          )
        })}
      </div>
      {message ? <p role="alert" className="mt-3 text-xs text-[#ff766f]">{message}</p> : null}
    </div>
  )
}
