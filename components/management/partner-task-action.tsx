'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PartnerTaskAction({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(nextStatus: 'in_progress' | 'completed') {
    const resolutionNote = nextStatus === 'completed'
      ? window.prompt('Nota de resolución obligatoria')?.trim()
      : null
    if (nextStatus === 'completed' && !resolutionNote) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/management/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, resolutionNote }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible actualizar la tarea')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la tarea')
    } finally {
      setLoading(false)
    }
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2">
    {status === 'pending' ? <button disabled={loading} onClick={() => void update('in_progress')} className="border border-[var(--n3-line)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Iniciar</button> : null}
    {status !== 'completed' ? <button disabled={loading} onClick={() => void update('completed')} className="border border-[#d7332b] px-3 py-1.5 text-xs font-semibold text-[#ff766f] disabled:opacity-50">Completar</button> : null}
    {error ? <span className="text-xs text-[#ff766f]">{error}</span> : null}
  </div>
}
