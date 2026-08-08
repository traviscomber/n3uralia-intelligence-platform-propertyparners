'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'

type MemoryItem = {
  id: string
  proposalReference: string | null
  title: string
  status: string | null
  priority: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  resolution: string | null
  outcomeRecorded: boolean
  eventCount: number
}

type MemoryResponse = {
  available: boolean
  reason: 'role_scope' | 'source_unavailable' | null
  summary: {
    total: number
    open: number
    inProgress: number
    done: number
    dismissed: number
    outcomesRecorded: number
  } | null
  items: MemoryItem[]
  generatedAt: string
  mode: 'verified-task-history-only'
  learningClaim?: 'none'
  writesPerformed: 0
}

function statusLabel(status: string | null) {
  if (status === 'open') return 'Abierta'
  if (status === 'in_progress') return 'En curso'
  if (status === 'done') return 'Cerrada'
  if (status === 'dismissed') return 'Descartada'
  return status || 'Sin estado'
}

export function PedroPabloOperationalMemory() {
  const [data, setData] = useState<MemoryResponse | null>(null)

  useEffect(() => {
    let active = true
    void fetch('/api/pedro-pablo/operational-memory', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<MemoryResponse> : null)
      .then((payload) => { if (active && payload) setData(payload) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (!data?.available || !data.summary || !data.summary.total) return null

  return <section className="border-t border-[var(--n3-line)] pt-6" aria-labelledby="pedro-pablo-memory-title">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]"><History aria-hidden="true" size={14} /> Seguimiento confirmado</div>
        <h2 id="pedro-pablo-memory-title" className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">Historial operacional de Pedro Pablo</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">Sólo muestra acciones que terminaron convertidas en tareas reales. No interpreta patrones ni declara aprendizaje automático.</p>
      </div>
      <div className="text-right text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{data.summary.outcomesRecorded} resultados registrados / {data.summary.total} tareas</div>
    </div>

    <div className="mt-4 grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-2 xl:grid-cols-4">
      {data.items.slice(0, 4).map((item) => <article key={item.id} className="bg-[var(--n3-black)] p-4">
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><span>{statusLabel(item.status)}</span><span>{item.priority || 'sin prioridad'}</span></div>
        <div className="mt-2 text-sm font-medium leading-5 text-[var(--n3-text-light)]">{item.title}</div>
        <div className="mt-2 text-[10px] text-[var(--n3-text-muted)]">Creada {new Date(item.createdAt).toLocaleDateString('es-CL')}</div>
        {item.outcomeRecorded && item.resolution ? <p className="mt-3 border-t border-[var(--n3-line)] pt-3 text-xs leading-5 text-[var(--n3-text-muted)]"><span className="text-[var(--n3-text-light)]">Resultado registrado:</span> {item.resolution}</p> : <p className="mt-3 border-t border-[var(--n3-line)] pt-3 text-xs leading-5 text-[var(--n3-text-muted)]">Sin resultado registrado todavía.</p>}
      </article>)}
    </div>
  </section>
}
