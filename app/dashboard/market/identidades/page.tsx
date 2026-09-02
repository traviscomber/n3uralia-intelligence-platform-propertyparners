'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ExternalLink, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { OperationalState } from '@/components/ui/operational-state'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

type ExternalCandidate = {
  propertyId: string
  address: string | null
  identityStatus: string | null
  identityConfidence: number | null
  componentId: string | null
}

type LiveIdentityRow = {
  listingId: string
  sourceListingId: string
  title: string | null
  address: string | null
  url: string | null
  priceUf: number | null
  observedAt: string | null
  issueKind: 'confirmed_component' | 'external_collision' | 'external_identity_candidate' | 'candidate_high' | 'candidate_medium' | 'evidence_gap'
  candidatePropertyId: string | null
  candidatePropertyAddress: string | null
  matchId: string | null
  matchStatus: string | null
  matchScore: number | null
  matchEvidence: Array<Record<string, unknown>> | null
  matchContradictions: Record<string, unknown> | null
  externalCandidates: ExternalCandidate[]
  externalCandidateCount: number
  externalComponentCount: number
}

type QueueSummary = {
  unlinked: number
  confirmedComponents: number
  externalCollisions: number
  strongCandidates: number
  mediumCandidates: number
  externalIdentityCandidates: number
  evidenceGaps: number
}

type QueuePayload = { summary: QueueSummary; rows: LiveIdentityRow[] }

type DecisionDraft = {
  row: LiveIdentityRow
  decision: 'confirmed' | 'rejected'
  sourceReference: string
  notes: string
}

const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

function price(value: number | null) {
  return value == null ? '—' : `${nf.format(value)} UF`
}

function observed(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(parsed)
}

function resolutionKind(row: LiveIdentityRow) {
  if (row.issueKind === 'confirmed_component') return 'confirmed_component'
  if (row.issueKind === 'external_identity_candidate') return 'external_identity'
  return 'match'
}

function issueLabel(row: LiveIdentityRow) {
  if (row.issueKind === 'confirmed_component') return 'Componente duplicado ya confirmado'
  if (row.issueKind === 'external_collision') return 'Colisión externa sin componente único'
  if (row.issueKind === 'external_identity_candidate') return 'Identidad externa única'
  if (row.issueKind === 'candidate_high') return 'Candidato fuerte'
  if (row.issueKind === 'candidate_medium') return 'Candidato medio'
  return 'Evidencia insuficiente'
}

function canConfirm(row: LiveIdentityRow) {
  return Boolean(row.candidatePropertyId) && row.issueKind !== 'external_collision' && row.issueKind !== 'evidence_gap'
}

export default function MarketLiveIdentityQueuePage() {
  const router = useRouter()
  const [data, setData] = useState<QueuePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<DecisionDraft | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/market/identity/live', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la cola live de identidad.')
      setData(payload as QueuePayload)
    } catch (cause) {
      setData(null)
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar la cola live de identidad.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!loading && data?.summary.unlinked === 0) router.replace('/dashboard/market')
  }, [data, loading, router])

  const actionable = useMemo(() => (data?.rows ?? []).filter((row) => row.issueKind !== 'evidence_gap'), [data])
  const gaps = useMemo(() => (data?.rows ?? []).filter((row) => row.issueKind === 'evidence_gap'), [data])

  function openDecision(row: LiveIdentityRow, decision: 'confirmed' | 'rejected') {
    setDraft({ row, decision, sourceReference: row.url || '', notes: '' })
  }

  async function submitDecision() {
    if (!draft || !draft.sourceReference.trim() || !draft.row.candidatePropertyId) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/market/identity/live', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: draft.row.listingId,
          resolutionKind: resolutionKind(draft.row),
          decision: draft.decision,
          candidatePropertyId: draft.row.candidatePropertyId,
          matchId: draft.row.matchId,
          sourceReference: draft.sourceReference.trim(),
          notes: draft.notes.trim(),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 403 && payload?.error === 'MFA_REQUIRED') {
        window.location.href = `/auth/mfa?next=${encodeURIComponent('/dashboard/market/identidades')}`
        return
      }
      if (!response.ok) throw new Error(payload?.error || 'No fue posible registrar la decisión.')
      setDraft(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible registrar la decisión.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return <WorkspaceShell><OperationalState kind="loading" title="Cargando identidad live" description="Separando decisiones revisables de casos sin evidencia suficiente." /></WorkspaceShell>
  }

  const summary = data?.summary
  const reviewableNow = (summary?.confirmedComponents ?? 0) + (summary?.externalIdentityCandidates ?? 0) + (summary?.strongCandidates ?? 0) + (summary?.mediumCandidates ?? 0) + (summary?.externalCollisions ?? 0)

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Mercado · Identidad live"
      title="Resolver sólo lo que tiene evidencia"
      meta="La cola contiene únicamente casas activas sin property_id. Nada se fusiona ni se vincula por similitud automática."
      actions={[
        { label: 'Mercado', href: '/dashboard/market', icon: <ArrowLeft size={14} /> },
        { label: 'Duplicados históricos', href: '/dashboard/properties/admin/identity', icon: <ShieldCheck size={14} /> },
        { label: 'Actualizar', onClick: () => void load(), icon: <RefreshCw size={14} />, ariaLabel: 'Actualizar identidad live' },
      ]}
    />

    {error ? <div role="alert" className="mt-4 border border-[#ff8d87]/40 px-4 py-3 text-sm text-[#ff8d87]">{error}</div> : null}

    {summary ? <MetricStrip items={[
      { label: 'Sin vínculo live', value: summary.unlinked },
      { label: 'Revisables ahora', value: reviewableNow, tone: reviewableNow > 0 ? 'warning' : 'default' },
      { label: 'Falta evidencia', value: summary.evidenceGaps, tone: summary.evidenceGaps > 0 ? 'warning' : 'default' },
      { label: 'Vínculo automático', value: 'Desactivado' },
    ]} /> : null}

    {actionable.length > 0 ? <section className="mt-7">
      <div className="border-b border-[var(--n3-line)] pb-2">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Decisiones posibles ahora · {actionable.length}</h2>
      </div>
      <div className="divide-y divide-[var(--n3-line)]">
        {actionable.map((row) => {
          const isOpen = draft?.row.listingId === row.listingId
          const contradictionCount = row.matchContradictions ? Object.keys(row.matchContradictions).length : 0
          return <article key={row.listingId} className="py-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_auto] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${row.issueKind === 'external_collision' ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>{issueLabel(row)}</span>
                  <span className="text-[10px] text-[var(--n3-text-muted)]">Portal {row.sourceListingId}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-[var(--n3-text-light)]">{row.title || row.address || 'Publicación sin título'}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{row.address || 'Sin dirección normalizada'} · {price(row.priceUf)} · observado {observed(row.observedAt)}</p>
                {row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--n3-teal-soft)] hover:underline">Abrir fuente <ExternalLink size={13} /></a> : null}
              </div>

              <div className="min-w-0 border-l border-[var(--n3-line)] pl-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Evidencia de identidad</p>
                {row.candidatePropertyAddress ? <p className="mt-2 text-sm font-medium">{row.candidatePropertyAddress}</p> : <p className="mt-2 text-sm text-[#ff8d87]">No existe un candidato único publicable.</p>}
                {row.matchScore != null ? <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Match {Math.round(row.matchScore * 100)}%{contradictionCount ? ` · ${contradictionCount} contradicción(es)` : ' · sin contradicciones fuertes'}</p> : null}
                {row.issueKind === 'confirmed_component' ? <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{row.externalCandidateCount} registros legacy pertenecen al mismo componente de duplicado ya confirmado. La revisión sólo vincula el aviso a ese componente lógico; no borra ni fusiona filas.</p> : null}
                {row.issueKind === 'external_collision' ? <p className="mt-2 text-xs leading-5 text-[#ff8d87]">Los candidatos pertenecen a componentes distintos. El sistema bloquea cualquier elección hasta contar con evidencia adicional.</p> : null}
                {row.externalCandidates.length > 1 ? <div className="mt-3 space-y-1">{row.externalCandidates.map((candidate) => <p key={candidate.propertyId} className="truncate text-[11px] text-[var(--n3-text-muted)]">{candidate.address || candidate.propertyId}</p>)}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {canConfirm(row) ? <button type="button" onClick={() => openDecision(row, 'confirmed')} className="inline-flex min-h-10 items-center gap-2 border border-[#78d59a]/40 px-3 text-xs text-[#78d59a]"><Check size={14}/>{row.issueKind === 'confirmed_component' ? 'Vincular al componente' : 'Confirmar vínculo'}</button> : null}
                {(row.issueKind === 'candidate_high' || row.issueKind === 'candidate_medium') ? <button type="button" onClick={() => openDecision(row, 'rejected')} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)]"><X size={14}/>Rechazar candidato</button> : null}
              </div>
            </div>

            {isOpen && draft ? <div className="mt-5 grid gap-3 border-t border-[var(--n3-line)] pt-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="text-xs text-[var(--n3-text-muted)]">Referencia de evidencia
                <input value={draft.sourceReference} onChange={(event) => setDraft({ ...draft, sourceReference: event.target.value })} maxLength={500} className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm text-white" placeholder="URL, documento o referencia verificable" />
              </label>
              <label className="text-xs text-[var(--n3-text-muted)]">Nota de revisión
                <input value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={1000} className="mt-1 min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm text-white" placeholder="Criterio utilizado" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(null)} disabled={saving} className="min-h-11 border border-[var(--n3-line)] px-4 text-xs text-[var(--n3-text-muted)]">Cancelar</button>
                <button type="button" onClick={() => void submitDecision()} disabled={saving || !draft.sourceReference.trim()} className={`min-h-11 px-4 text-xs font-semibold text-white disabled:opacity-40 ${draft.decision === 'rejected' ? 'bg-[#7d2c29]' : 'bg-[#2f8f4e]'}`}>{saving ? 'Guardando…' : draft.decision === 'rejected' ? 'Registrar rechazo' : 'Confirmar con MFA2'}</button>
              </div>
            </div> : null}
          </article>
        })}
      </div>
    </section> : null}

    {gaps.length > 0 ? <details className="mt-8 border-t border-[var(--n3-line)] pt-4">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
        <span>Publicaciones sin evidencia suficiente</span><strong>{gaps.length}</strong>
      </summary>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">No se ofrece un botón de vínculo porque no existe un candidato defendible. Estos avisos requieren nueva evidencia antes de crear o asociar una identidad.</p>
      <div className="mt-4 divide-y divide-[var(--n3-line)]">{gaps.map((row) => <article key={row.listingId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-sm font-medium">{row.title || row.address || 'Publicación sin título'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Portal {row.sourceListingId} · {row.address || 'sin dirección normalizada'} · {price(row.priceUf)}</p></div>{row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-[var(--n3-teal-soft)] hover:underline">Abrir fuente <ExternalLink size={13}/></a> : null}</article>)}</div>
    </details> : null}

    <p className="mt-8 border-t border-[var(--n3-line)] pt-4 text-xs leading-5 text-[var(--n3-text-muted)]">Una confirmación humana registra auditoría, vincula las observaciones existentes del mismo aviso y guarda memoria exacta para futuros scrapes. La memoria nunca se crea desde similitud automática y no fusiona propiedades canónicas.</p>
  </WorkspaceShell>
}
