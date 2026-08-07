'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function IdentityConfirmationForm({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const [sourceReference, setSourceReference] = useState('')
  const [confidence, setConfidence] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit() {
    setBusy(true); setMessage('')
    const response = await fetch(`/api/market/identity/${propertyId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceReference, confidence: Number(confidence), notes }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.status === 403 && data.error === 'MFA_REQUIRED') {
      window.location.href = `/auth/mfa?next=${encodeURIComponent('/dashboard/market/identidades')}`
      return
    }
    if (!response.ok) {
      setMessage(data.message || data.error || 'No fue posible confirmar la identidad.')
      setBusy(false)
      return
    }
    router.refresh()
  }

  return <div className="mt-4 grid gap-3 border-t border-[var(--n3-line)] pt-4 md:grid-cols-[minmax(0,1.5fr)_130px_minmax(0,1fr)_auto] md:items-end">
    <label className="text-xs text-[var(--n3-text-muted)]">Referencia de evidencia
      <input value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="URL, inscripción, documento o referencia verificable" className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm text-white" />
    </label>
    <label className="text-xs text-[var(--n3-text-muted)]">Confianza
      <input type="number" min="0.8" max="1" step="0.01" value={confidence} onChange={(event) => setConfidence(event.target.value)} placeholder="0,80–1,00" className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm text-white" />
    </label>
    <label className="text-xs text-[var(--n3-text-muted)]">Nota
      <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Criterio utilizado" className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm text-white" />
    </label>
    <button type="button" disabled={busy || !sourceReference.trim() || !confidence} onClick={() => void submit()} className="min-h-11 bg-[#d7332b] px-4 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Confirmando…' : 'Confirmar'}</button>
    {message ? <p role="alert" className="text-xs text-[#ff766f] md:col-span-4">{message}</p> : null}
  </div>
}
