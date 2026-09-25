'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, RefreshCw, X } from 'lucide-react'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

type Property = {
  id: string
  normalized_address: string | null
  property_type: string | null
  useful_area_m2: number | null
  built_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  identity_status: string | null
  identity_confidence: number | null
  last_seen_at: string | null
}

type Match = {
  id: string
  score: number
  status: string
  evidence: Array<Record<string, unknown>>
  contradictions: Record<string, unknown>
  left: Property | null
  right: Property | null
}

type Payload = { status: string; total: number; summary: { candidateHigh:number; candidateMedium:number; pending:number; confirmed:number; rejected:number }; rows: Match[] }

const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
function area(property: Property | null) { return property?.useful_area_m2 ?? property?.built_area_m2 ?? null }
function value(value: number | null | undefined) { return value == null ? '—' : nf.format(value) }
function address(property: Property | null) { return property?.normalized_address || 'Sin dirección' }

export default function PropertyIdentityReviewPage() {
  const [status, setStatus] = useState<'candidate_high' | 'candidate_medium'>('candidate_high')
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState(false)

  async function load() {
    setLoading(true); setError(false)
    try {
      const response = await fetch(`/api/market/identity/matches?status=${status}&limit=100`, { cache: 'no-store' })
      if (!response.ok) throw new Error('LOAD_FAILED')
      setData(await response.json())
    } catch { setData(null); setError(true) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [status])

  async function decide(match: Match, decision: 'confirmed' | 'rejected') {
    const sourceReference = window.prompt('Referencia de evidencia (URL, documento o revisión):')?.trim() || ''
    if (!sourceReference) return
    const notes = window.prompt('Notas de revisión (opcional):')?.trim() || ''
    setSaving(match.id); setError(false)
    try {
      const response = await fetch('/api/market/identity/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: match.id, decision, sourceReference, notes }),
      })
      if (!response.ok) throw new Error('SAVE_FAILED')
      await load()
    } catch { setError(true) } finally { setSaving(null) }
  }

  if (loading && !data) return <WorkspaceShell><OperationalState kind="loading" title="Cargando candidatos" description="Preparando pares de identidad para revisión humana." /></WorkspaceShell>

  const rows = data?.rows ?? []
  const high = status === 'candidate_high'

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Identidad de mercado"
      title="Revisión de duplicados"
      meta="Ningún candidato se fusiona automáticamente"
      actions={[
        { label: 'Administración', href: '/dashboard/properties/admin', icon: <ArrowLeft size={14} /> },
        { label: 'Actualizar', onClick: () => void load(), icon: <RefreshCw size={14} />, ariaLabel: 'Actualizar candidatos' },
      ]}
    />

    {error ? <div role="alert" className="mt-4 border border-[#ff8d87]/40 px-4 py-3 text-sm text-[#ff8d87]">No fue posible completar la última operación. La confirmación exige MFA nivel 2 y permisos de gestión.</div> : null}

    <MetricStrip items={[
      { label: high ? 'Pendientes alta' : 'Pendientes media', value: data?.total ?? 0, tone: (data?.total ?? 0) ? 'warning' : 'success' },
      { label: 'Pendientes totales', value: data?.summary.pending ?? 0, tone: (data?.summary.pending ?? 0) ? 'warning' : 'success' },
      { label: 'Confirmados', value: data?.summary.confirmed ?? 0, tone: (data?.summary.confirmed ?? 0) ? 'success' : 'default' },
      { label: 'Rechazados', value: data?.summary.rejected ?? 0 },
      { label: 'Visibles ahora', value: rows.length },
    ]} />

    <div className="mt-5 flex gap-2">
      <button onClick={() => setStatus('candidate_high')} className={`min-h-10 px-4 text-sm ${high ? 'bg-[var(--primary)] font-semibold' : 'border border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>Alta confianza</button>
      <button onClick={() => setStatus('candidate_medium')} className={`min-h-10 px-4 text-sm ${!high ? 'bg-[var(--primary)] font-semibold' : 'border border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>Confianza media</button>
    </div>

    <section className="mt-6">
      <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Candidatos pendientes</h2></div>
      {rows.length ? <div className="divide-y divide-[var(--n3-line)]">{rows.map((match) => {
        const contradictionCount = Object.keys(match.contradictions || {}).length
        return <article key={match.id} className="py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto] xl:items-center">
            <PropertyCard label="A" property={match.left} />
            <PropertyCard label="B" property={match.right} />
            <div><span className="text-xs text-[var(--n3-text-muted)]">Match</span><strong className="mt-1 block text-xl tabular-nums">{nf.format(Number(match.score) * 100)}%</strong><span className={`mt-1 block text-xs ${contradictionCount ? 'text-[#ff8d87]' : 'text-[var(--n3-text-muted)]'}`}>{contradictionCount ? `${contradictionCount} contradicción(es)` : 'Sin contradicciones fuertes'}</span></div>
            <div className="flex gap-2 xl:justify-end"><button disabled={saving === match.id} onClick={() => void decide(match, 'rejected')} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)] disabled:opacity-40"><X size={14}/>No son la misma</button><button disabled={saving === match.id} onClick={() => void decide(match, 'confirmed')} className="inline-flex min-h-10 items-center gap-2 border border-[#78d59a]/40 px-3 text-xs text-[#78d59a] disabled:opacity-40"><Check size={14}/>Misma propiedad</button></div>
          </div>
        </article>
      })}</div> : <OperationalState compact kind="success" title="Cola vacía" description="No existen candidatos pendientes en este nivel." />}
    </section>

    <p className="mt-6 text-xs leading-5 text-[var(--n3-text-muted)]">Confirmar un match registra una equivalencia revisada entre dos identidades contractuales. No borra registros, no modifica publicaciones y no confirma por sí solo la identidad maestra de ninguna propiedad.</p>
    <DataStatusBar cutoff="Revisión actual" coverage={`${rows.length} de ${data?.total ?? 0} candidatos del nivel visibles · ${data?.summary.pending ?? 0} pendientes totales`} issues={data?.summary.pending ?? 0} status={(data?.summary.pending ?? 0) ? 'partial' : 'ready'} />
  </WorkspaceShell>
}

function PropertyCard({ label, property }: { label: string; property: Property | null }) {
  if (!property) return <div className="text-sm text-[var(--n3-text-muted)]">Propiedad no disponible</div>
  return <div className="min-w-0"><span className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Propiedad {label}</span><Link href={`/dashboard/properties/${property.id}`} className="mt-1 block truncate text-sm font-semibold hover:text-[var(--n3-teal-soft)]">{address(property)}</Link><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property.property_type || 'n/d'} · {value(area(property))} m² · {property.bedrooms ?? '—'}D/{property.bathrooms ?? '—'}B · identidad {property.identity_status || '—'}</p></div>
}
