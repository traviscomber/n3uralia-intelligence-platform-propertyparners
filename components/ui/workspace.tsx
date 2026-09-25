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

export function WorkspaceShell({ children, className = '', contentClassName = 'max-w-[1180px]' }: { children: ReactNode; className?: string; contentClassName?: string }) {
  return <div className={`min-h-full bg-[var(--n3-black)] px-0 py-1 text-[var(--n3-text-light)] sm:px-2 sm:py-3 md:px-3 md:py-5 ${className}`}><div className={`mx-auto w-full ${contentClassName}`}>{children}</div></div>
}

export function WorkspaceHeader({ eyebrow, title, meta, controls, actions = [] }: { eyebrow?: string; title?: string; meta?: ReactNode; controls?: ReactNode; actions?: WorkspaceAction[] }) {
  return <header className="grid gap-4 border-b border-[var(--n3-line)] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
    <div className="min-w-0">
      {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{eyebrow}</p> : null}
      {title ? <h1 className="mt-1 max-w-full break-words text-[clamp(1.75rem,6vw,2.25rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--n3-text-light)]">{title}</h1> : null}
      {controls ? <div className={title || eyebrow ? 'mt-3' : ''}>{controls}</div> : null}
      {meta ? <div className="mt-2 max-w-4xl break-words text-[10px] uppercase leading-5 tracking-[0.12em] text-[var(--n3-text-muted)] sm:text-[11px] sm:tracking-[0.14em]">{meta}</div> : null}
    </div>
    {actions.length ? <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">{actions.map((action) => {
      const size = action.label ? 'min-h-11 px-4' : 'h-11 w-11'
      const classes = action.primary
        ? `inline-flex ${size} w-full items-center justify-center gap-2 bg-[var(--primary)] text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto`
        : `inline-flex ${size} w-full items-center justify-center gap-2 border border-[var(--n3-line)] text-xs font-semibold text-[var(--n3-text-muted)] transition-colors hover:border-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto`
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
  return <input {...props} className={`min-h-11 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 text-base text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus-visible:border-[var(--n3-teal-soft)] focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:text-sm ${className}`} />
}

export function WorkspaceSelect({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`min-h-11 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 text-base text-[var(--n3-text-light)] outline-none focus-visible:border-[var(--n3-teal-soft)] focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:text-sm ${className}`} />
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' }> }) {
  const toneClass = {
    default: 'text-[var(--n3-text-light)]',
    success: 'text-[var(--chart-3)]',
    warning: 'text-[var(--chart-4)]',
    danger: 'text-[var(--destructive)]',
  }
  return <section aria-label="Indicadores" className="grid grid-cols-2 gap-px border-y border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-4">{items.map((item) => <article key={item.label} className="min-w-0 bg-[var(--n3-black)] px-3 py-4 sm:px-4 sm:py-5">
    <p className="min-h-8 break-words text-[10px] uppercase leading-4 tracking-[0.12em] text-[var(--n3-text-muted)] sm:min-h-0">{item.label}</p>
    <div className={`mt-1.5 break-words text-2xl font-semibold tabular-nums sm:mt-2 sm:text-3xl ${toneClass[item.tone ?? 'default']}`}>{item.value}</div>
    {item.detail ? <div className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{item.detail}</div> : null}
  </article>)}</section>
}

export function DataStatusBar({ cutoff, coverage, issues = 0, status, issueLabel = 'observaciones de datos' }: { cutoff: string; coverage?: string; issues?: number; status?: 'ready' | 'partial' | 'blocked'; issueLabel?: string }) {
  const label = status === 'ready' ? 'Datos listos' : status === 'blocked' ? 'Datos insuficientes' : 'Cobertura parcial'
  const tone = status === 'ready' ? 'text-[var(--chart-3)]' : status === 'blocked' ? 'text-[var(--destructive)]' : 'text-[var(--chart-4)]'
  return <section aria-label="Estado de los datos" className="mt-5 grid gap-2 border-y border-[var(--n3-line)] py-3 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
    <span className={`font-semibold ${tone}`}>{label}</span>
    <span className="text-[var(--n3-text-muted)]">Corte {cutoff}</span>
    {coverage ? <span className="text-[var(--n3-text-muted)]">{coverage}</span> : null}
    <span className={issues ? 'text-[var(--chart-4)] sm:ml-auto' : 'text-[var(--n3-text-muted)] sm:ml-auto'}>{issues ? `${issues} ${issueLabel}` : 'Sin observaciones reportadas'}</span>
  </section>
}
