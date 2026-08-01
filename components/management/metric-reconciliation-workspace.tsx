'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'

type Entity = { id: string; name: string; entity_type: string }
type Definition = { code: string; label: string; unit: string; formula_version: number; methodology: string }
type MetricValue = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  source_name: string
  source_reference: string | null
  quality_status: string
  evaluation_status: string
  formula_version: number
  created_at: string
}
type Reconciliation = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  published_value_id: string | null
  calculated_value_id: string | null
  published_value: number | string | null
  calculated_value: number | string | null
  absolute_delta: number | string | null
  relative_delta: number | string | null
  tolerance: number | string
  reconciliation_status: string
  publication_status: string
  formula_version: number
  notes: string | null
  approved_at: string | null
  updated_at: string
}
type Payload = {
  role: string
  calculatedSource: string
  entities: Entity[]
  definitions: Definition[]
  values: MetricValue[]
  reconciliations: Reconciliation[]
}

function numeric(value: number | string | null) {
  if (value === null) return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

function formatValue(value: number | string | null) {
  const result = numeric(value)
  return result === null ? 'n/d' : result.toLocaleString('es-CL', { maximumFractionDigits: 4 })
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    exact: 'Exacta',
    within_tolerance: 'Dentro de tolerancia',
    different: 'Diferente',
    not_comparable: 'No comparable',
    blocked: 'Bloqueada',
    provisional: 'Provisional',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  }
  return labels[value] ?? value
}

export function MetricReconciliationWorkspace() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [publishedValueId, setPublishedValueId] = useState('')
  const [calculatedValueId, setCalculatedValueId] = useState('')
  const [tolerancePercent, setTolerancePercent] = useState('1')
  const [notes, setNotes] = useState('')

  async function load() {
    setLoading(true)
    const response = await fetch('/api/management/reconciliations', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) setMessage(payload.error || 'No fue posible cargar la conciliación.')
    else setData(payload)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const entities = useMemo(() => new Map(data?.entities.map((item) => [item.id, item]) ?? []), [data])
  const definitions = useMemo(() => new Map(data?.definitions.map((item) => [item.code, item]) ?? []), [data])
  const values = useMemo(() => new Map(data?.values.map((item) => [item.id, item]) ?? []), [data])
  const publishedCandidates = useMemo(
    () => data?.values.filter((item) => item.source_name !== data.calculatedSource && item.evaluation_status === 'evaluable' && item.value !== null) ?? [],
    [data],
  )
  const calculatedCandidates = useMemo(
    () => data?.values.filter((item) => item.source_name === data.calculatedSource && item.quality_status === 'verified' && item.evaluation_status === 'evaluable' && item.value !== null) ?? [],
    [data],
  )

  function candidateLabel(item: MetricValue) {
    const entity = entities.get(item.entity_id)?.name ?? item.entity_id
    const metric = definitions.get(item.metric_code)?.label ?? item.metric_code
    return `${entity} · ${metric} · ${item.period_start.slice(0, 7)} · ${formatValue(item.value)} · ${item.source_name}`
  }

  async function createReconciliation() {
    setMessage(null)
    setBusy(true)
    try {
      const response = await fetch('/api/management/reconciliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishedValueId,
          calculatedValueId,
          tolerance: Number(tolerancePercent) / 100,
          notes,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible conciliar.')
      setMessage('Conciliación registrada. Aún no está publicada.')
      setNotes('')
      await load()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible conciliar.')
    } finally {
      setBusy(false)
    }
  }

  async function decide(id: string, action: 'approve' | 'reject' | 'reopen') {
    const decisionNotes = window.prompt(action === 'approve' ? 'Nota de aprobación' : 'Motivo u observación') || ''
    setMessage(null)
    setBusy(true)
    try {
      const response = await fetch('/api/management/reconciliations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes: decisionNotes }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible registrar la decisión.')
      setMessage(action === 'approve' ? 'Métrica aprobada y disponible para publicación.' : 'Decisión registrada.')
      await load()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible registrar la decisión.')
    } finally {
      setBusy(false)
    }
  }

  const counts = useMemo(() => {
    const rows = data?.reconciliations ?? []
    return {
      provisional: rows.filter((item) => item.publication_status === 'provisional').length,
      approved: rows.filter((item) => item.publication_status === 'approved').length,
      blocked: rows.filter((item) => item.publication_status === 'blocked').length,
      rejected: rows.filter((item) => item.publication_status === 'rejected').length,
    }
  }, [data])

  if (loading) return <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando conciliación…</div>
  if (!data) return <div className="border border-[#d7332b] p-6 text-sm">No fue posible cargar la conciliación.</div>

  return (
    <div className="space-y-8">
      {message ? <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4 text-sm">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Pendientes CEO', counts.provisional],
          ['Aprobadas', counts.approved],
          ['Bloqueadas', counts.blocked],
          ['Rechazadas', counts.rejected],
        ].map(([label, value]) => (
          <div key={String(label)} className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--n3-text-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="border border-[var(--n3-line)] bg-[#080d0d]">
        <div className="border-b border-[var(--n3-line)] p-5">
          <p className="text-xs uppercase tracking-widest text-[#ff766f]">Nueva conciliación</p>
          <h2 className="mt-2 text-xl font-semibold">Comparar fuente publicada con cálculo canónico</h2>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">La tolerancia es relativa al valor publicado. Registrar la comparación no publica el dato.</p>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          <label className="text-xs text-[var(--n3-text-muted)]">Valor publicado
            <select value={publishedValueId} onChange={(event) => setPublishedValueId(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-[#050909] p-3 text-sm">
              <option value="">Seleccione evidencia independiente</option>
              {publishedCandidates.map((item) => <option key={item.id} value={item.id}>{candidateLabel(item)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[var(--n3-text-muted)]">Valor calculado
            <select value={calculatedValueId} onChange={(event) => setCalculatedValueId(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-[#050909] p-3 text-sm">
              <option value="">Seleccione cálculo canónico verificado</option>
              {calculatedCandidates.map((item) => <option key={item.id} value={item.id}>{candidateLabel(item)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[var(--n3-text-muted)]">Tolerancia porcentual
            <input type="number" min="0" max="100" step="0.1" value={tolerancePercent} onChange={(event) => setTolerancePercent(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-[#050909] p-3 text-sm" />
          </label>
          <label className="text-xs text-[var(--n3-text-muted)]">Nota de conciliación
            <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className="mt-2 w-full border border-[var(--n3-line)] bg-[#050909] p-3 text-sm" />
          </label>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--n3-line)] p-5">
          <p className="text-xs text-[var(--n3-text-muted)]">Fuentes disponibles: {publishedCandidates.length} publicadas · {calculatedCandidates.length} calculadas.</p>
          <button disabled={busy || !publishedValueId || !calculatedValueId} onClick={() => void createReconciliation()} className="flex items-center gap-2 border border-[#d7332b] px-4 py-3 text-sm disabled:opacity-40"><RefreshCw size={15} />Conciliar</button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-xs uppercase tracking-widest text-[#ff766f]">Bandeja de decisiones</p><h2 className="mt-2 text-xl font-semibold">Publicación controlada</h2></div>
          <button onClick={() => void load()} disabled={busy} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Actualizar</button>
        </div>
        <div className="overflow-x-auto border border-[var(--n3-line)]">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-[#080d0d]"><tr><th className="p-3 text-left">Entidad / métrica</th><th className="p-3 text-left">Período</th><th className="p-3 text-right">Publicado</th><th className="p-3 text-right">Calculado</th><th className="p-3 text-right">Δ relativo</th><th className="p-3 text-left">Conciliación</th><th className="p-3 text-left">Publicación</th><th className="p-3 text-left">Acciones</th></tr></thead>
            <tbody>
              {data.reconciliations.map((item) => {
                const entity = entities.get(item.entity_id)?.name ?? item.entity_id
                const definition = definitions.get(item.metric_code)
                const relativeDelta = numeric(item.relative_delta)
                const published = item.published_value_id ? values.get(item.published_value_id) : null
                const calculated = item.calculated_value_id ? values.get(item.calculated_value_id) : null
                const canApprove = data.role === 'ceo' && item.publication_status === 'provisional' && ['exact', 'within_tolerance'].includes(item.reconciliation_status)
                return <tr key={item.id} className="border-t border-[var(--n3-line)] align-top">
                  <td className="p-3"><p className="font-medium">{entity}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{definition?.label ?? item.metric_code} · fórmula v{item.formula_version}</p></td>
                  <td className="p-3">{item.period_start} — {item.period_end}</td>
                  <td className="p-3 text-right"><p>{formatValue(item.published_value)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{published?.source_name ?? 'n/d'}</p></td>
                  <td className="p-3 text-right"><p>{formatValue(item.calculated_value)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{calculated?.source_name ?? 'n/d'}</p></td>
                  <td className="p-3 text-right">{relativeDelta === null ? 'n/d' : `${(relativeDelta * 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`}</td>
                  <td className="p-3">{statusLabel(item.reconciliation_status)}</td>
                  <td className="p-3"><span className="inline-flex border border-[var(--n3-line)] px-2 py-1 text-xs">{statusLabel(item.publication_status)}</span>{item.approved_at ? <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{new Date(item.approved_at).toLocaleString('es-CL')}</p> : null}</td>
                  <td className="p-3"><div className="flex flex-wrap gap-2">
                    {canApprove ? <button onClick={() => void decide(item.id, 'approve')} className="flex items-center gap-1 border border-emerald-700 px-2 py-1 text-xs"><ShieldCheck size={13} />Aprobar</button> : null}
                    {item.publication_status !== 'rejected' ? <button onClick={() => void decide(item.id, 'reject')} className="flex items-center gap-1 border border-[#d7332b] px-2 py-1 text-xs"><XCircle size={13} />Rechazar</button> : null}
                    {['rejected', 'approved'].includes(item.publication_status) && data.role === 'ceo' ? <button onClick={() => void decide(item.id, 'reopen')} className="flex items-center gap-1 border border-[var(--n3-line)] px-2 py-1 text-xs"><CheckCircle2 size={13} />Reabrir</button> : null}
                  </div></td>
                </tr>
              })}
              {!data.reconciliations.length ? <tr><td colSpan={8} className="p-8 text-center text-[var(--n3-text-muted)]">No existen conciliaciones. El sistema no publicará métricas persistidas hasta recibir una fuente independiente y un cálculo canónico verificado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
