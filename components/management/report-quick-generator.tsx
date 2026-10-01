'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, FileText, UserRound } from 'lucide-react'

type ReportPartner = { name: string; branch: string }

type Props = {
  branches: string[]
  partners: ReportPartner[]
  compact?: boolean
}

type Level = 'pl-real-estate' | 'office' | 'partner'

const levelCopy: Record<Level, { label: string; detail: string }> = {
  'pl-real-estate': {
    label: 'PL Real Estate',
    detail: 'Consolidado para Travis y directoras.',
  },
  office: {
    label: 'Oficina',
    detail: 'Resultado de una oficina con bajada por Partner.',
  },
  partner: {
    label: 'Partner',
    detail: 'Reporte individual y privado.',
  },
}

export function ReportQuickGenerator({ branches, partners, compact = false }: Props) {
  const [level, setLevel] = useState<Level>('pl-real-estate')
  const [branch, setBranch] = useState(branches[0] ?? '')
  const availablePartners = useMemo(
    () => partners.filter((item) => !branch || item.branch === branch),
    [branch, partners],
  )
  const [partner, setPartner] = useState(partners[0]?.name ?? '')

  const selectedPartner = availablePartners.some((item) => item.name === partner)
    ? partner
    : availablePartners[0]?.name ?? ''

  const href = level === 'pl-real-estate'
    ? '/dashboard/ceo/reporte'
    : level === 'office'
      ? `/dashboard/reportes/audiencias/director-cuenta?branch=${encodeURIComponent(branch)}`
      : `/dashboard/reportes/audiencias/ejecutivo?partner=${encodeURIComponent(selectedPartner)}`

  return <section className={compact ? 'border border-[var(--n3-line)] bg-[#0c1111] p-5' : 'border border-[var(--n3-line)] bg-[#0c1111] p-6'}>
    <div className="flex flex-col gap-2 border-b border-[var(--n3-line)] pb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Pedro Pablo · Reportes</p>
      <h2 className="text-xl font-semibold">Generar reporte</h2>
      <p className="max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">Tres niveles, una sola fuente canónica. Elige destinatario y abre la versión lista para revisar, imprimir o guardar como PDF.</p>
    </div>

    <div className="mt-5 grid gap-2 md:grid-cols-3">
      {([
        ['pl-real-estate', FileText],
        ['office', Building2],
        ['partner', UserRound],
      ] as const).map(([id, Icon]) => {
        const active = level === id
        return <button
          key={id}
          type="button"
          onClick={() => setLevel(id)}
          aria-pressed={active}
          className={`min-h-24 border p-4 text-left transition ${active ? 'border-[#d7332b] bg-[#080d0d]' : 'border-[var(--n3-line)] hover:border-[#7a2d29]'}`}
        >
          <Icon size={17} className={active ? 'text-[#ff766f]' : 'text-[var(--n3-text-muted)]'} />
          <p className="mt-3 text-sm font-semibold">{levelCopy[id].label}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{levelCopy[id].detail}</p>
        </button>
      })}
    </div>

    {level !== 'pl-real-estate' ? <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-xs text-[var(--n3-text-muted)]">
        Oficina
        <select
          value={branch}
          onChange={(event) => {
            const nextBranch = event.target.value
            setBranch(nextBranch)
            const first = partners.find((item) => item.branch === nextBranch)
            if (first) setPartner(first.name)
          }}
          className="mt-2 min-h-11 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 text-sm text-[var(--n3-text-light)]"
        >
          {branches.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      {level === 'partner' ? <label className="text-xs text-[var(--n3-text-muted)]">
        Partner
        <select
          value={selectedPartner}
          onChange={(event) => setPartner(event.target.value)}
          className="mt-2 min-h-11 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 text-sm text-[var(--n3-text-light)]"
        >
          {availablePartners.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
      </label> : null}
    </div> : null}

    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Link
        href={href}
        className="inline-flex min-h-11 items-center justify-center border border-[#d7332b] px-5 py-2 text-sm font-semibold text-[#ff766f]"
      >
        Generar reporte
      </Link>
      <span className="text-xs text-[var(--n3-text-muted)]">No envía nada automáticamente.</span>
    </div>
  </section>
}
