import Link from 'next/link'
import type { ReactNode } from 'react'

type OperationalStateKind = 'loading' | 'empty' | 'error' | 'restricted' | 'success' | 'stale' | 'info'

type OperationalStateProps = {
  kind: OperationalStateKind
  title: string
  description: string
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
  error: 'border-[var(--destructive)]',
  restricted: 'border-[var(--destructive)]',
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
  const isError = kind === 'error'

  return (
    <div
      className={`border bg-[var(--n3-deep)] ${accents[kind]} ${compact ? 'p-4' : 'p-6 sm:p-8'}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : kind === 'loading' ? 'polite' : undefined}
      aria-busy={kind === 'loading' ? true : undefined}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">
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
          className="mt-5 inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 py-2 text-sm font-semibold text-[var(--n3-text-light)] transition-colors hover:border-[var(--n3-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal)]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
