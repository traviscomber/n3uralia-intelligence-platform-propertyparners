import Link from 'next/link'
import type { ReactNode } from 'react'

type OperationalStateKind = 'loading' | 'empty' | 'error' | 'restricted' | 'success' | 'stale' | 'info'

type OperationalStateProps = {
  kind: OperationalStateKind
  title: string
  description: string
  /**
   * Deprecated. Technical errors must never be rendered in the browser.
   * Kept temporarily for compatibility while callers migrate.
   */
  detail?: string | null
  reference?: string | null
  action?: { label: string; href: string }
  children?: ReactNode
  compact?: boolean
}

const labels: Record<OperationalStateKind, string> = {
  loading: 'Cargando',
  empty: 'Sin datos',
  error: 'Error',
  restricted: 'Acceso restringido',
  success: 'Completado',
  stale: 'Datos desactualizados',
  info: 'Información',
}

const accents: Record<OperationalStateKind, string> = {
  loading: 'border-[var(--n3-line)]',
  empty: 'border-[var(--n3-line)]',
  error: 'border-[#d7332b]',
  restricted: 'border-[#d7332b]',
  success: 'border-[#65d3a5]',
  stale: 'border-[#f6c453]',
  info: 'border-[var(--n3-line)]',
}

export function OperationalState({
  kind,
  title,
  description,
  reference,
  action,
  children,
  compact = false,
}: OperationalStateProps) {
  return (
    <div
      className={`border bg-[#0c1111] ${accents[kind]} ${compact ? 'p-4' : 'p-6 sm:p-8'}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'loading' ? 'polite' : undefined}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">
        {labels[kind]}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{title}</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">{description}</p>
      {reference ? (
        <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">
          Referencia del incidente: {reference}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold text-[var(--n3-text-light)] hover:border-[var(--n3-teal)]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
