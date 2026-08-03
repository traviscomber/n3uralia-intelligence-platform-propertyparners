import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Action = { label: string; href: string; primary?: boolean }
type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical'
type ActionVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

const statusToneClasses: Record<StatusTone, string> = {
  neutral: 'border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--n3-text-muted)]',
  info: 'border-[#6aa9ff]/45 bg-[#0d1722] text-[#9bc4ff]',
  success: 'border-[#65d3a5]/45 bg-[#0c1b16] text-[#8ce2bc]',
  warning: 'border-[#f6c453]/45 bg-[#211a0d] text-[#f8d77f]',
  critical: 'border-[var(--destructive)]/60 bg-[#160d0c] text-[var(--n3-teal-soft)]',
}

const actionVariantClasses: Record<ActionVariant, string> = {
  primary: 'border-[var(--n3-teal)] bg-[var(--n3-teal)] text-white hover:opacity-90',
  secondary: 'border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--n3-text-light)] hover:border-[var(--n3-teal-soft)]',
  tertiary: 'border-transparent bg-transparent text-[var(--n3-text-light)] hover:border-[var(--n3-line)] hover:bg-[var(--muted)]',
  destructive: 'border-[var(--destructive)] bg-[#160d0c] text-[var(--n3-teal-soft)] hover:bg-[#21100e]',
}

const actionBaseClasses = 'inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function IntelligencePage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1500px] space-y-8 pb-16">{children}</div>
}

export function IntelligenceHeader({
  eyebrow,
  title,
  description,
  actions = [],
  meta,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: Action[]
  meta?: ReactNode
}) {
  return (
    <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
      <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--n3-teal-soft)]">{eyebrow}</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-[-0.03em] text-[var(--n3-text-light)] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">{description}</p>
          {actions.length > 0 ? (
            <nav aria-label="Acciones de la vista" className="mt-6 flex flex-wrap gap-2">
              {actions.map((action) => (
                <ActionLink
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  variant={action.primary ? 'primary' : 'secondary'}
                >
                  {action.label}
                </ActionLink>
              ))}
            </nav>
          ) : null}
        </div>
        {meta ? <aside className="w-full shrink-0 lg:w-auto" aria-label="Resumen de la vista">{meta}</aside> : null}
      </div>
    </header>
  )
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--n3-text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function ActionLink({
  href,
  children,
  variant = 'secondary',
  className = '',
}: {
  href: string
  children: ReactNode
  variant?: ActionVariant
  className?: string
}) {
  return <Link href={href} className={`${actionBaseClasses} ${actionVariantClasses[variant]} ${className}`}>{children}</Link>
}

export function ActionButton({
  children,
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ActionVariant
}) {
  return <button type={type} className={`${actionBaseClasses} ${actionVariantClasses[variant]} ${className}`} {...props}>{children}</button>
}

export function FormField({
  id,
  label,
  children,
  hint,
  error,
  required = false,
}: {
  id: string
  label: string
  children: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2" data-field-id={id} data-hint-id={hintId} data-error-id={errorId}>
      <label htmlFor={id} className="block text-sm font-semibold text-[var(--n3-text-light)]">
        {label}{required ? <span className="ml-1 text-[var(--n3-teal-soft)]" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint ? <p id={hintId} className="text-xs leading-5 text-[var(--n3-text-muted)]">{hint}</p> : null}
      {error ? <p id={errorId} role="alert" className="text-xs leading-5 text-[var(--n3-teal-soft)]">{error}</p> : null}
    </div>
  )
}

export function MetricGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  const xl = columns === 2 ? 'xl:grid-cols-2' : columns === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
  return <div className={`grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 ${xl}`}>{children}</div>
}

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return <article className="bg-[var(--n3-deep)] p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-4 text-3xl font-semibold text-[var(--n3-text-light)]">{value}</p>{detail ? <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{detail}</p> : null}</article>
}

export function IntelligencePanel({ eyebrow, title, description, children, critical = false }: { eyebrow: string; title: string; description?: string; children?: ReactNode; critical?: boolean }) {
  return <article className={critical ? 'border border-[var(--destructive)] bg-[#160d0c]' : 'border border-[var(--n3-line)] bg-[var(--n3-deep)]'}><div className="p-5"><p className="text-xs uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2>{description ? <p className="mt-2 text-sm leading-5 text-[var(--n3-text-muted)]">{description}</p> : null}</div>{children}</article>
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span className={`inline-flex min-h-6 items-center border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusToneClasses[tone]}`}>
      {children}
    </span>
  )
}

export function FilterBar({
  children,
  actions,
  label = 'Filtros de la vista',
}: {
  children: ReactNode
  actions?: ReactNode
  label?: string
}) {
  return (
    <section aria-label={label} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

export function DataTable({
  children,
  label,
  minWidth = 760,
}: {
  children: ReactNode
  label: string
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto border border-[var(--n3-line)] bg-[var(--n3-deep)]" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-[var(--n3-line)] bg-[var(--muted)] text-xs uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{children}</thead>
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[var(--n3-line)]">{children}</tbody>
}

export function DataTableHeaderCell({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return <th scope="col" className={`px-4 py-3 font-semibold ${numeric ? 'text-right' : 'text-left'}`}>{children}</th>
}

export function DataTableCell({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return <td className={`px-4 py-3 align-top text-[var(--n3-text-light)] ${numeric ? 'text-right tabular-nums' : 'text-left'}`}>{children}</td>
}

export function RankedRow({ index, rank, label, value, share }: { index?: number; rank?: number; label: ReactNode; value: ReactNode; share?: ReactNode }) {
  const position = rank ?? ((index ?? 0) + 1)
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--n3-line)] px-5 py-3 last:border-b-0">
      <span className="text-xs text-[var(--n3-teal-soft)]">{String(position).padStart(2, '0')}</span>
      <span className="min-w-0 truncate text-sm" title={typeof label === 'string' ? label : undefined}>{label}</span>
      <strong className="text-right text-sm">{value}{share ? <span className="ml-2 text-xs font-normal text-[var(--n3-text-muted)]">{share}</span> : null}</strong>
    </div>
  )
}

export function MethodologyNote({ children }: { children: ReactNode }) {
  return <p className="border-l-2 border-[var(--n3-teal)] pl-3 text-sm leading-5 text-[var(--n3-text-muted)]">{children}</p>
}
