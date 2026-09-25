'use client'

import Link from 'next/link'

export type PropertyLifecycleEvent = {
  id: string
  occurredAt: string
  type: string
  domain: 'market' | 'internal' | 'registry'
  label: string
  detail: string
  valueUf: number | null
  href: string | null
}

const n0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

function dateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

function domainLabel(value: PropertyLifecycleEvent['domain']) {
  if (value === 'internal') return 'Operación PP'
  if (value === 'registry') return 'Registro'
  return 'Mercado'
}

export function Property360LifecycleTimeline({
  events,
  commercialClosureLinked,
  commercialClosureNote,
}: {
  events: PropertyLifecycleEvent[]
  commercialClosureLinked: boolean
  commercialClosureNote: string
}) {
  return <section className="mt-7">
    <div className="flex flex-col gap-2 border-b border-[var(--n3-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Lifecycle canónico</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Historia de la propiedad</h2>
      </div>
      <span className="text-xs text-[var(--n3-text-muted)]">{events.length} hitos trazados</span>
    </div>

    {events.length ? <div className="divide-y divide-[var(--n3-line)]">
      {events.map((event) => {
        const content = <div className="grid gap-2 py-4 sm:grid-cols-[130px_minmax(0,1fr)_140px] sm:items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{domainLabel(event.domain)}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{dateTime(event.occurredAt)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--n3-text-light)]">{event.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{event.detail}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium tabular-nums">{event.valueUf == null ? '—' : `UF ${n0.format(event.valueUf)}`}</p>
            {event.href ? <span className="mt-1 inline-flex text-xs text-[var(--n3-teal-soft)]">Abrir evidencia →</span> : null}
          </div>
        </div>
        return event.href
          ? <Link key={event.id} href={event.href} target={event.href.startsWith('http') ? '_blank' : undefined} rel={event.href.startsWith('http') ? 'noreferrer' : undefined} className="block hover:bg-white/[0.02]">{content}</Link>
          : <article key={event.id}>{content}</article>
      })}
    </div> : <div className="py-5 text-sm text-[var(--n3-text-muted)]">No existen hitos suficientes para reconstruir el lifecycle.</div>}

    <div className="border-t border-[var(--n3-line)] pt-4">
      <p className="text-xs leading-5 text-[var(--n3-text-muted)]">
        <strong className="text-[var(--n3-text-light)]">Cierre comercial PP:</strong> {commercialClosureLinked ? 'Enlazado canónicamente.' : commercialClosureNote}
      </p>
    </div>
  </section>
}
