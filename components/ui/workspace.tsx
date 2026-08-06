import Link from 'next/link'
import type { ReactNode } from 'react'

export type WorkspaceAction = {
  label: string
  href?: string
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  icon?: ReactNode
  ariaLabel?: string
}

export function WorkspaceShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`min-h-screen bg-[var(--n3-black)] px-4 py-4 text-[var(--n3-text-light)] sm:px-6 md:px-8 md:py-6 ${className}`}><div className="mx-auto max-w-[1120px]">{children}</div></main>
}

export function WorkspaceHeader({ eyebrow, title, meta, controls, actions = [] }: { eyebrow?: string; title?: string; meta?: ReactNode; controls?: ReactNode; actions?: WorkspaceAction[] }) {
  return <header className="grid gap-4 border-b border-[var(--n3-line)] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
    <div className="min-w-0">
      {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{eyebrow}</p> : null}
      {title ? <h1 className="mt-1 truncate text-2xl font-semibold text-[var(--n3-text-light)]">{title}</h1> : null}
      {controls ? <div className={title || eyebrow ? 'mt-3' : ''}>{controls}</div> : null}
      {meta ? <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{meta}</div> : null}
    </div>
    {actions.length ? <div className="flex flex-wrap items-center gap-2">{actions.map((action) => {
      const classes = action.primary
        ? 'inline-flex min-h-10 items-center justify-center gap-2 bg-[var(--primary)] px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] disabled:cursor-not-allowed disabled:opacity-40'
        : 'inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--n3-line)] px-3 text-xs font-semibold text-[var(--n3-text-muted)] transition-colors hover:border-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] disabled:cursor-not-allowed disabled:opacity-40'
      if (action.href) return <Link key={`${action.label}-${action.href}`} href={action.href} aria-label={action.ariaLabel} className={classes}>{action.icon}{action.label}</Link>
      return <button key={action.label} type="button" onClick={action.onClick} disabled={action.disabled} aria-label={action.ariaLabel} className={classes}>{action.icon}{action.label}</button>
    })}</div> : null}
  </header>
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' }> }) {
  const toneClass = { default: 'text-[var(--n3-text-light)]', success: 'text-[#78d59a]', warning: 'text-[#f0c96a]', danger: 'text-[#ff766f]' }
  return <section aria-label="Indicadores" className="grid border-b border-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">{items.map((item, index) => <article key={item.label} className={`border-b border-[var(--n3-line)] py-4 ${index % 4 ? 'sm:px-4' : 'pr-4'} ${index < items.length - 1 ? 'lg:border-r' : ''}`}>
    <p className="text-[10px] uppercase tracking-[0.13em] text-[var(--n3-text-muted)]">{item.label}</p>
    <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass[item.tone ?? 'default']}`}>{item.value}</div>
    {item.detail ? <div className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.detail}</div> : null}
  </article>)}</section>
}

export function DataStatusBar({ cutoff, coverage, issues = 0, status }: { cutoff: string; coverage?: string; issues?: number; status?: 'ready' | 'partial' | 'blocked' }) {
  const label = status === 'ready' ? 'Datos listos' : status === 'blocked' ? 'Datos insuficientes' : 'Cobertura parcial'
  const tone = status === 'ready' ? 'text-[#78d59a]' : status === 'blocked' ? 'text-[#ff766f]' : 'text-[#f0c96a]'
  return <section aria-label="Estado de los datos" className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-[var(--n3-line)] py-3 text-xs">
    <span className={`font-semibold ${tone}`}>{label}</span>
    <span className="text-[var(--n3-text-muted)]">Corte {cutoff}</span>
    {coverage ? <span className="text-[var(--n3-text-muted)]">{coverage}</span> : null}
    <span className={issues ? 'ml-auto text-[#ff766f]' : 'ml-auto text-[var(--n3-text-muted)]'}>{issues ? `${issues} fuentes con error` : 'Sin errores reportados'}</span>
  </section>
}
