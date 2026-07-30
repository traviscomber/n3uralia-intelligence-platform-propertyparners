import Link from 'next/link'
import type { ReactNode } from 'react'

type Action = { label: string; href: string; primary?: boolean }

export type OperationalDataStatus = 'confirmed' | 'candidate' | 'observed' | 'incomplete' | 'no_data'
export type OperationalFreshness = 'recent' | 'aging' | 'stale' | 'unknown'

const operationalStatusStyles: Record<OperationalDataStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmado', className: 'border-emerald-500/40 text-emerald-300' },
  candidate: { label: 'Candidato', className: 'border-amber-500/40 text-amber-300' },
  observed: { label: 'Observado', className: 'border-sky-500/40 text-sky-300' },
  incomplete: { label: 'Incompleto', className: 'border-[#d7332b]/60 text-[#ff766f]' },
  no_data: { label: 'Sin datos', className: 'border-white/15 text-[var(--n3-text-muted)]' },
}

const freshnessStyles: Record<OperationalFreshness, { label: string; className: string }> = {
  recent: { label: 'Reciente', className: 'text-emerald-300' },
  aging: { label: 'Envejeciendo', className: 'text-amber-300' },
  stale: { label: 'Desactualizado', className: 'text-[#ff766f]' },
  unknown: { label: 'Sin observación', className: 'text-[var(--n3-text-muted)]' },
}

function displayDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha inválida' : parsed.toLocaleString('es-CL')
}

export function IntelligencePage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1500px] space-y-8 pb-16">{children}</div>
}

export function IntelligenceHeader({ eyebrow, title, description, actions = [], meta }: { eyebrow: string; title: string; description: string; actions?: Action[]; meta?: ReactNode }) {
  return <header className="border-b border-[var(--n3-line)] pb-8 pt-2"><div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">{eyebrow}</p><h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-[-0.03em] text-[var(--n3-text-light)] sm:text-5xl">{title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">{description}</p>{actions.length ? <div className="mt-6 flex flex-wrap gap-3">{actions.map((action) => <Link key={action.href} href={action.href} className={action.primary ? 'bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white' : 'border border-[var(--n3-line)] px-4 py-2.5 text-xs font-semibold hover:border-[#d7332b]'}>{action.label}</Link>)}</div> : null}</div>{meta}</div></header>
}

export function OperationalPageStatus({ connected, observedAt, processedAt, freshness, warning, source }: { connected: boolean; observedAt: string | null; processedAt: string | null; freshness: OperationalFreshness; warning?: string | null; source: string }) {
  const freshnessStyle = freshnessStyles[freshness]
  return <section className="border border-[var(--n3-line)] bg-[#0c1111]">
    <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
      <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Conexión</p><p className={`mt-2 text-sm font-semibold ${connected ? 'text-emerald-300' : 'text-[#ff766f]'}`}>{connected ? 'Base operativa conectada' : 'Base no disponible'}</p></div>
      <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fuente</p><p className="mt-2 text-sm font-semibold">{source}</p></div>
      <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Observado hasta</p><p className="mt-2 text-sm font-semibold">{displayDate(observedAt)}</p></div>
      <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Vigencia</p><p className={`mt-2 text-sm font-semibold ${freshnessStyle.className}`}>{freshnessStyle.label}</p></div>
    </div>
    <div className="flex flex-col justify-between gap-2 border-t border-[var(--n3-line)] px-4 py-3 text-xs text-[var(--n3-text-muted)] sm:flex-row"><span>Procesado: {displayDate(processedAt)}</span>{warning ? <strong className="text-[#ff766f]">{warning}</strong> : <span>Sin advertencias críticas</span>}</div>
  </section>
}

export function OperationalDataCard({ label, value, status, observedAt, source, explanation }: { label: string; value: ReactNode; status: OperationalDataStatus; observedAt: string | null; source: string; explanation: string }) {
  const style = operationalStatusStyles[status]
  return <article className="flex min-h-[235px] flex-col bg-[#0c1111] p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><span className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${style.className}`}>{style.label}</span></div>
    <p className="mt-5 text-3xl font-semibold text-[var(--n3-text-light)]">{value ?? 'Sin datos'}</p>
    <p className="mt-3 flex-1 text-xs leading-5 text-[var(--n3-text-muted)]">{explanation}</p>
    <div className="mt-5 border-t border-[var(--n3-line)] pt-3 text-[10px] leading-4 text-[var(--n3-text-muted)]"><p>Fuente: {source}</p><p>Observado: {displayDate(observedAt)}</p></div>
  </article>
}

export function OperationalDataGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">{eyebrow}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{title}</h2>{description ? <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{description}</p> : null}</div>{action}</div>
}

export function MetricGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) { const xl = columns === 2 ? 'xl:grid-cols-2' : columns === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'; return <div className={`grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 ${xl}`}>{children}</div> }
export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) { return <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-4 text-3xl font-semibold text-[var(--n3-text-light)]">{value}</p>{detail ? <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{detail}</p> : null}</article> }
export function IntelligencePanel({ eyebrow, title, description, children, critical = false }: { eyebrow: string; title: string; description?: string; children?: ReactNode; critical?: boolean }) { return <article className={critical ? 'border border-[#d7332b] bg-[#160d0c]' : 'border border-[var(--n3-line)] bg-[#0c1111]'}><div className="p-5"><p className="text-[10px] uppercase text-[#ff766f]">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2>{description ? <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{description}</p> : null}</div>{children}</article> }

export function RankedRow({ index, rank, label, value, share }: { index?: number; rank?: number; label: ReactNode; value: ReactNode; share?: ReactNode }) {
  const position = rank ?? index ?? 0
  return <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-[var(--n3-line)] px-5 py-3"><span className="text-xs text-[#ff766f]">{String(position + 1).padStart(2, '0')}</span><span className="text-sm">{label}</span><strong className="text-sm">{value}{share ? <span className="ml-2 text-xs text-[var(--n3-text-muted)]">{share}</span> : null}</strong></div>
}

export function MethodologyNote({ children }: { children: ReactNode }) { return <p className="border-l-2 border-[#d7332b] pl-3 text-xs text-[var(--n3-text-muted)]">{children}</p> }
