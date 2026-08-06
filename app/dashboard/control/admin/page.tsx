'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Database, Save, Target } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { getPublicErrorMessage } from '@/lib/public-error'

type Entity = { id: string; name: string; entity_type: string }
type Definition = { code: string; label: string; unit: string; methodology: string }
type Goal = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  target_value: number
  management_entities?: { name: string }
  management_metric_definitions?: { label: string; unit: string }
}
type Rule = {
  id: string
  code: string
  label: string
  metric_code: string
  comparison: string
  threshold: number
  severity: string
  scope_type: string
  active: boolean
}
type Alert = {
  id: string
  title: string
  detail: string
  severity: string
  status: string
  created_at: string
  management_entities?: { name: string }
}
type Payload = {
  entities: Entity[]
  definitions: Definition[]
  goals: Goal[]
  rules: Rule[]
  alerts: Alert[]
}
type Feedback = { kind: 'success' | 'error'; message: string } | null

const monthBounds = (month: string) => {
  const start = `${month}-01`
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return { start, end: date.toISOString().slice(0, 10) }
}

const formatMonth = (value: string) => {
  const month = value.slice(0, 7)
  const [year, monthIndex] = month.split('-').map(Number)
  if (!year || !monthIndex) return value
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1)),
  )
}

export default function ManagementAdminPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [goal, setGoal] = useState({
    entityId: '',
    metricCode: 'sales',
    month: currentMonth,
    targetValue: '',
    sourceName: 'Meta aprobada',
  })
  const [metric, setMetric] = useState({
    entityId: '',
    metricCode: 'sales',
    month: currentMonth,
    value: '',
    sourceName: 'Carga administrativa',
    sourceReference: '',
    qualityStatus: 'provisional',
  })
  const [rule, setRule] = useState({
    code: '',
    label: '',
    metricCode: 'sales',
    comparison: 'lt',
    threshold: '',
    severity: 'warning',
    scopeType: 'all',
    responsibleRole: 'director',
  })

  async function load() {
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/management/admin', { cache: 'no-store' })
      const payload = (await response.json()) as Payload
      if (!response.ok) throw new Error('ADMIN_LOAD_FAILED')
      setData(payload)
      const first = payload.entities?.[0]?.id || ''
      setGoal((value) => ({ ...value, entityId: value.entityId || first }))
      setMetric((value) => ({ ...value, entityId: value.entityId || first }))
    } catch {
      setData(null)
      setFeedback({ kind: 'error', message: getPublicErrorMessage('DATA_UNAVAILABLE') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setGoal((value) => ({ ...value, month: selectedMonth }))
    setMetric((value) => ({ ...value, month: selectedMonth }))
  }, [selectedMonth])

  async function post(body: unknown) {
    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/management/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error('ADMIN_SAVE_FAILED')
      setFeedback({ kind: 'success', message: 'Cambios guardados.' })
      await load()
    } catch {
      setFeedback({ kind: 'error', message: getPublicErrorMessage('SAVE_FAILED') })
    } finally {
      setSaving(false)
    }
  }

  async function updateAlert(id: string, action: string) {
    const notes = action === 'resolve' || action === 'dismiss' ? window.prompt('Notas') || '' : ''
    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/management/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes }),
      })
      if (!response.ok) throw new Error('ALERT_UPDATE_FAILED')
      setFeedback({ kind: 'success', message: 'Alerta actualizada.' })
      await load()
    } catch {
      setFeedback({ kind: 'error', message: getPublicErrorMessage('REQUEST_FAILED') })
    } finally {
      setSaving(false)
    }
  }

  const goalsForMonth = useMemo(
    () => data?.goals.filter((item) => item.period_start.slice(0, 7) === selectedMonth) ?? [],
    [data, selectedMonth],
  )
  const openAlerts = useMemo(
    () => data?.alerts.filter((alert) => ['open', 'acknowledged'].includes(alert.status)) ?? [],
    [data],
  )
  const criticalAlerts = openAlerts.filter((alert) => alert.severity === 'critical').length

  if (loading) {
    return <main role="status" className="min-h-screen bg-[#050707] p-6 text-sm text-white/50">Cargando…</main>
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#050707] p-6 text-white">
        {feedback?.kind === 'error' ? <PublicErrorNotice message={feedback.message} /> : null}
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050707] px-4 py-4 text-white sm:px-6 md:px-8 md:py-6">
      <div className="mx-auto max-w-[1120px]">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label htmlFor="goals-period" className="text-[10px] uppercase tracking-[0.16em] text-white/40">Período</label>
            <input
              id="goals-period"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="mt-1 block min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-base font-semibold text-white outline-none focus:border-white/40"
            />
          </div>
          <div className="flex items-center gap-4 text-xs tabular-nums">
            <span className="text-white/40">{goalsForMonth.length} metas</span>
            {criticalAlerts > 0 ? <span className="text-[#ff8d87]">{criticalAlerts} críticas</span> : null}
          </div>
        </header>

        {feedback?.kind === 'error' ? <div className="mt-4"><PublicErrorNotice message={feedback.message} /></div> : null}
        {feedback?.kind === 'success' ? <div role="status" className="mt-4 border border-[#78d59a]/40 px-4 py-3 text-sm text-[#78d59a]">{feedback.message}</div> : null}

        <section className="mt-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h1 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Metas · {formatMonth(selectedMonth)}</h1>
          </div>

          <div className="grid gap-3 border-b border-white/10 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_180px_auto]">
            <select value={goal.entityId} onChange={(event) => setGoal({ ...goal, entityId: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white">
              {data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
            <select value={goal.metricCode} onChange={(event) => setGoal({ ...goal, metricCode: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white">
              {data.definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}
            </select>
            <input type="number" value={goal.targetValue} onChange={(event) => setGoal({ ...goal, targetValue: event.target.value })} placeholder="Nueva meta" className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white placeholder:text-white/30" />
            <button
              type="button"
              disabled={saving || !goal.entityId || !goal.targetValue}
              onClick={() => {
                const bounds = monthBounds(selectedMonth)
                void post({ type: 'goal', ...goal, month: selectedMonth, periodStart: bounds.start, periodEnd: bounds.end })
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#d7332b] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/35">
                <tr><th className="py-3 pr-4 font-medium">Entidad</th><th className="px-3 py-3 font-medium">Métrica</th><th className="px-3 py-3 text-right font-medium">Meta</th></tr>
              </thead>
              <tbody>
                {goalsForMonth.map((item) => (
                  <tr key={item.id} className="border-b border-white/8 text-sm">
                    <td className="py-3 pr-4 font-medium text-white/85">{item.management_entities?.name ?? item.entity_id}</td>
                    <td className="px-3 py-3 text-white/60">{item.management_metric_definitions?.label ?? item.metric_code}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{Number(item.target_value).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
                {goalsForMonth.length === 0 ? <tr><td colSpan={3} className="py-6 text-sm text-white/40">Sin metas para este período</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Alertas</h2>
            <span className="text-xs tabular-nums text-white/35">{openAlerts.length}</span>
          </div>
          <div className="divide-y divide-white/8">
            {openAlerts.map((alert) => (
              <article key={alert.id} className="grid gap-3 py-4 md:grid-cols-[8px_minmax(0,1fr)_auto] md:items-center">
                <span className={`h-2 w-2 rounded-full ${alert.severity === 'critical' ? 'bg-[#d7332b]' : 'bg-[#f0c96a]'}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-medium text-white/90">{alert.title}</h3>
                    <span className="text-xs text-white/35">{alert.management_entities?.name ?? 'Entidad'}</span>
                  </div>
                  {alert.detail ? <p className="mt-1 truncate text-xs text-white/45">{alert.detail}</p> : null}
                </div>
                <div className="flex gap-2">
                  {alert.status === 'open' ? <button disabled={saving} onClick={() => void updateAlert(alert.id, 'acknowledge')} className="border border-white/12 px-3 py-2 text-xs text-white/65">Revisar</button> : null}
                  <button disabled={saving} onClick={() => void updateAlert(alert.id, 'resolve')} className="border border-[#78d59a]/35 px-3 py-2 text-xs text-[#78d59a]">Resolver</button>
                  <button disabled={saving} onClick={() => void updateAlert(alert.id, 'dismiss')} className="border border-white/10 px-3 py-2 text-xs text-white/40">Descartar</button>
                </div>
              </article>
            ))}
            {openAlerts.length === 0 ? <div className="py-6 text-sm text-white/40">Sin alertas abiertas</div> : null}
          </div>
        </section>

        <details className="mt-8 border-t border-white/10 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-white/60 [&::-webkit-details-marker]:hidden">
            <span>Configuración avanzada</span><ChevronRight size={16} />
          </summary>

          <div className="mt-5 space-y-7">
            <section>
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Registrar evidencia</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <select value={metric.entityId} onChange={(event) => setMetric({ ...metric, entityId: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white">{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select>
                <select value={metric.metricCode} onChange={(event) => setMetric({ ...metric, metricCode: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white">{data.definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select>
                <input type="number" value={metric.value} onChange={(event) => setMetric({ ...metric, value: event.target.value })} placeholder="Valor" className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white" />
                <input value={metric.sourceReference} onChange={(event) => setMetric({ ...metric, sourceReference: event.target.value })} placeholder="Referencia" className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white" />
                <select value={metric.qualityStatus} onChange={(event) => setMetric({ ...metric, qualityStatus: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white"><option value="provisional">Provisional</option><option value="verified">Verificada</option></select>
                <button disabled={saving || !metric.value} onClick={() => { const bounds = monthBounds(selectedMonth); void post({ type: 'metric', ...metric, month: selectedMonth, periodStart: bounds.start, periodEnd: bounds.end }) }} className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 text-sm text-white/70 disabled:opacity-40"><Database size={15} /> Registrar</button>
              </div>
            </section>

            <section>
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Reglas de alerta</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input value={rule.code} onChange={(event) => setRule({ ...rule, code: event.target.value })} placeholder="Código" className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white" />
                <input value={rule.label} onChange={(event) => setRule({ ...rule, label: event.target.value })} placeholder="Nombre" className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white" />
                <select value={rule.metricCode} onChange={(event) => setRule({ ...rule, metricCode: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white">{data.definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select>
                <select value={rule.comparison} onChange={(event) => setRule({ ...rule, comparison: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white"><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="drop_pct">Caída %</option><option value="increase_pct">Aumento %</option></select>
                <input type="number" value={rule.threshold} onChange={(event) => setRule({ ...rule, threshold: event.target.value })} placeholder="Umbral" className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white" />
                <select value={rule.severity} onChange={(event) => setRule({ ...rule, severity: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white"><option value="info">Informativa</option><option value="warning">Advertencia</option><option value="critical">Crítica</option></select>
                <select value={rule.scopeType} onChange={(event) => setRule({ ...rule, scopeType: event.target.value })} className="min-h-11 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white"><option value="all">Todos</option><option value="company">Compañía</option><option value="office">Oficina</option><option value="team">Equipo</option><option value="partner">Partner</option><option value="agent">Agente</option></select>
                <button disabled={saving || !rule.code || !rule.label || !rule.threshold} onClick={() => void post({ type: 'rule', ...rule })} className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 text-sm text-white/70 disabled:opacity-40"><Target size={15} /> Guardar regla</button>
              </div>

              <div className="mt-4 divide-y divide-white/8 border-t border-white/10">
                {data.rules.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3 text-sm"><span className="truncate text-white/75">{item.label}</span><span className="tabular-nums text-white/45">{item.threshold}</span><span className={item.active ? 'text-[#78d59a]' : 'text-white/30'}>{item.active ? 'Activa' : 'Inactiva'}</span></div>)}
              </div>
            </section>
          </div>
        </details>
      </div>
    </main>
  )
}
