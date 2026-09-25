'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Loader2 } from 'lucide-react'

type Props = {
  reportId: string
  status: string
}

export function CanonicalReportReviewActions({ reportId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'review' | 'approved' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const next = status === 'Borrador' ? 'review' : status === 'En revisión' ? 'approved' : null
  if (!next) return null

  async function transition() {
    if (!next || loading) return
    setLoading(next)
    setError(null)
    try {
      const response = await fetch(`/api/management/reports/canonical-status/${encodeURIComponent(reportId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const payload = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(payload?.error || 'No fue posible actualizar el informe.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar el informe.')
    } finally {
      setLoading(null)
    }
  }

  const approving = next === 'approved'
  return <div className="flex flex-col items-end gap-1">
    <button
      type="button"
      onClick={() => void transition()}
      disabled={Boolean(loading)}
      className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--n3-line)] px-3 text-xs font-medium disabled:opacity-50"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : approving ? <Check size={14} /> : <Eye size={14} />}
      {loading ? 'Guardando…' : approving ? 'Aprobar' : 'Marcar en revisión'}
    </button>
    {error ? <span role="alert" className="max-w-56 text-right text-[11px] text-[#ff766f]">{error}</span> : null}
  </div>
}
