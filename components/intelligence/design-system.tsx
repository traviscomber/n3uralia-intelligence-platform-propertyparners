import Link from 'next/link'
import type { ReactNode } from 'react'

type Action = { label: string; href: string; primary?: boolean }

export function IntelligencePage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1500px] space-y-8 pb-16">{children}</div>
}

export function IntelligenceHeader({ eyebrow, title, description, actions = [], meta }: { eyebrow: string; title: string; description: string; actions?: Action[]; meta?: ReactNode }) {
  return <header className="border-b border-[var(--n3-line)] pb-8 pt-2"><div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">{eyebrow}</p><h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-[-0.03em] text-[var(--n3-text-light)] sm:text-5xl">{title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">{description}</p></div></div></header>
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
