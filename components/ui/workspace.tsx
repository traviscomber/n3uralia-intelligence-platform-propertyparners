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
  return <div className={`min-h-screen bg-[var(--n3-black)] px-1 py-2 text-[var(--n3-text-light)] sm:px-3 sm:py-4 md:px-4 md:py-6 ${className}`}><div className="mx-auto max-w-[1120px]">{children}</div></div>
}

export function WorkspaceHeader({ eyebrow, title, meta, controls, actions = [] }: { eyebrow?: string; title?: string; meta?: ReactNode; controls?: ReactNode; actions?: WorkspaceAction[] }) {
  return <header className="grid gap-4 border-b border-[var(--n3-line)] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
    <div className="min-w-0">
      {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{eyebrow}</p> : null}
      {title ? <h1 className="mt-1 break-words text-2xl font-semibold leading-tight text-[var(--n3-text-light)] sm:text-3xl">{title}</h1> : null}
      {controls ? <div className={title || eyebrow ? 'mt-3' : ''}>{controls}</div> : null}
      {meta ? <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{meta}</div> : null}
    </div>
    {actions.length ? <div className="flex flex-wrap items-center gap-2">{actions.map((action) => {
      const size = action.label ? 'min-h-11 px-4' : 'h-11 w-11'
      const classes = action.primary
        ? `inline-flex ${size} items-center justify-center gap-2 bg-[var(--primary)] text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] disabled:cursor-not-allowed disabled:opacity-40`
        : `inline-flex ${size} items-center justify-center gap-2 border border-[var(--n3-line)] text-xs font-semibold text-[var(--n3-text-muted)] transition-colors hover:border-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] disabled:cursor-not-allowed disabled:opacity-40`
      if (action.href) return <Link key={`${action.label}-${action.href}`} href={action.href} aria-label={action.ariaLabel} className={classes}>{action.icon}{action.label}</Link>
      return <button key={action.ariaLabel || action.label} type="button" onClick={action.onClick} disabled={action.disabled} aria-label={action.ariaLabel} className={classes}>{action.icon}{action.label}</button>
    })}</div> : null}
  </header>
}

export function WorkspaceSurface({ children, className = '', as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  const classes = `border border-[var(--n3-line)] bg-[var(--n3-deep)] ${className}`
  if (as === 'div') return <div className={classes}>{children}</div>
  if (as === 'article') return <article className={classes}>{children}</article>
  return <section className={classes}>{children}</section>
}

export function WorkspaceField({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-11 border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 text-base text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus-visible:border-[var(--n3-teal-soft)] focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:text-sm ${className}`} />
}

export function WorkspaceSelect({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`min-h-11 border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 text-base text-[var(--n3-text-light)] outline-none focus-visible:border-[var(--n3-teal-soft)] focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:text-sm ${className}`} />
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' }> }) {
  const toneClass = {
    default: 'text-[var(--n3-text-light)]',
    success: 'text-[var(--chart-3)]',
    warning: 'text-[var(--chart-4)]',
    danger: 'text-[var(--destructive)]',
  }
  return <section aria-label="Indicadores" className="grid border-b border-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">{items.map((item, index) => <article key={item.label} className={`border-b border-[var(--n3-line)] py-4 ${index % 4 ? 'sm:px-4' : 'pr-4'} ${index < items.length - 1 ? 'lg:border-r' : ''}`}>
    <p className="text-[10px] uppercase tracking-[0.13em] text-[var(--n3-text-muted)]">{item.label}</p>
    <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass[item.tone ?? 'default']}`}>{item.value}</div>
    {item.detail ? <div className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.detail}</div> : null}
  </article>)}</section>
}

export function DataStatusBar({ cutoff, coverage, issues = 0, status, issueLabel = 'observaciones de datos' }: { cutoff: string; coverage?: string; issues?: number; status?: 'ready' | 'partial' | 'blocked'; issueLabel?: string }) {
  const label = status === 'ready' ? 'Datos listos' : status === 'blocked' ? 'Datos insuficientes' : 'Cobertura parcial'
  const tone = status === 'ready' ? 'text-[var(--chart-3)]' : status === 'blocked' ? 'text-[var(--destructive)]' : 'text-[var(--chart-4)]'
  return <section aria-label="Estado de los datos" className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-[var(--n3-line)] py-3 text-xs">
    <span className={`font-semibold ${tone}`}>{label}</span>
    <span className="text-[var(--n3-text-muted)]">Corte {cutoff}</span>
    {coverage ? <span className="text-[var(--n3-text-muted)]">{coverage}</span> : null}
    <span className={issues ? 'w-full text-[var(--chart-4)] sm:ml-auto sm:w-auto' : 'w-full text-[var(--n3-text-muted)] sm:ml-auto sm:w-auto'}>{issues ? `${issues} ${issueLabel}` : 'Sin observaciones reportadas'}</span>
  </section>
}
