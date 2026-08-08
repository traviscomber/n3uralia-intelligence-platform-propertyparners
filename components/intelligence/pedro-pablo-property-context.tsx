'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Building2, CircleAlert } from 'lucide-react'

type PropertyAttention = {
  assignmentId: string
  propertyId: string | null
  address: string | null
  propertyType: string | null
  identityStatus: string | null
  lastSeenAt: string | null
  needsIdentityReview: boolean
  needsFreshnessReview: boolean
}

type PropertyContext = {
  scope: string
  totalAssignments: number
  confirmedIdentity: number
  pendingIdentity: number
  staleAssignments: number
  attention: PropertyAttention[]
  generatedAt: string
}

function formatDate(value: string | null) {
  if (!value) return 'Sin observación'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no evaluable' : date.toLocaleDateString('es-CL')
}

export function PedroPabloPropertyContext() {
  const [context, setContext] = useState<PropertyContext | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/pedro-pablo/properties', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('unavailable')
        return response.json() as Promise<PropertyContext>
      })
      .then((payload) => {
        if (active) setContext(payload)
      })
      .catch(() => {
        if (active) setUnavailable(true)
      })
    return () => { active = false }
  }, [])

  if (unavailable) return null
  if (!context) {
    return <section className="border-t border-[var(--n3-line)] pt-5" aria-label="Contexto de propiedades"><div className="text-xs text-[var(--n3-text-muted)]" role="status">Consultando cartera autorizada…</div></section>
  }

  return (
    <section className="border-t border-[var(--n3-line)] pt-6" aria-labelledby="pedro-pablo-properties-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
            <Building2 aria-hidden="true" size={14} />
            Cuarto dominio · cartera
          </div>
          <h2 id="pedro-pablo-properties-title" className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Propiedades bajo observación</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">Pedro Pablo usa únicamente asignaciones visibles para tu rol. Identidad pendiente y falta de evidencia reciente se muestran como atención, no como datos corregidos.</p>
        </div>
        <Link href="/dashboard/properties" className="inline-flex min-h-9 items-center gap-2 border border-[var(--primary)] px-3 text-xs font-semibold text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">
          Abrir cartera
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>

      <div className="mt-5 grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-3">
        <div className="bg-[var(--n3-deep)] p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Asignaciones visibles</div><div className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{context.totalAssignments}</div></div>
        <div className="bg-[var(--n3-deep)] p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Identidad pendiente</div><div className="mt-2 text-2xl font-semibold text-[var(--chart-4)]">{context.pendingIdentity}</div></div>
        <div className="bg-[var(--n3-deep)] p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Sin vigencia reciente</div><div className="mt-2 text-2xl font-semibold text-[var(--chart-4)]">{context.staleAssignments}</div></div>
      </div>

      {context.attention.length ? (
        <div className="mt-5 border-y border-[var(--n3-line)]">
          {context.attention.slice(0, 5).map((item) => (
            <div key={item.assignmentId} className="flex flex-col gap-3 border-t border-[var(--n3-line)] py-4 first:border-t-0 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--n3-text-light)]"><CircleAlert aria-hidden="true" size={14} className="text-[var(--chart-4)]" />{item.address || 'Propiedad sin dirección normalizada'}</div>
                <div className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{item.propertyType || 'Tipo no informado'} · última evidencia {formatDate(item.lastSeenAt)}</div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
                {item.needsIdentityReview ? <span>Revisar identidad</span> : null}
                {item.needsFreshnessReview ? <span>Verificar vigencia</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 text-sm text-[var(--n3-text-muted)]">No hay propiedades con señales de identidad o vigencia que requieran revisión dentro de tu alcance.</div>
      )}
    </section>
  )
}
