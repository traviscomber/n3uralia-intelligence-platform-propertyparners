'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Database, Save, Target } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, IntelligencePanel, SectionHeading } from '@/components/intelligence/design-system'

type Entity = { id: string; name: string; entity_type: string }
type Definition = { code: string; label: string; unit: string; methodology: string }
type Goal = { id: string; entity_id: string; metric_code: string; period_start: string; period_end: string; target_value: number; management_entities?: { name: string }; management_metric_definitions?: { label: string; unit: string } }
type Rule = { id: string; code: string; label: string; metric_code: string; comparison: string; threshold: number; severity: string; scope_type: string; active: boolean }
type Alert = { id: string; title: string; detail: string; severity: string; status: string; created_at: string; management_entities?: { name: string } }
type ImportRun = { id: string; source_name: string; period_start: string; period_end: string; status: string; rows_received: number; rows_inserted: number; rows_updated: number; rows_rejected: number; created_at: string }
type Payload = { entities: Entity[]; definitions: Definition[]; goals: Goal[]; rules: Rule[]; alerts: Alert[]; imports: ImportRun[] }

const monthBounds = (month: string) => {
  const start = `${month}-01`
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return { start, end: date.toISOString().slice(0, 10) }
}

export default function ManagementAdminPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [goal, setGoal] = useState({ entityId: '', metricCode: 'sales', month: currentMonth, targetValue: '', sourceName: 'Meta aprobada' })
  const [metric, setMetric] = useState({ entityId: '', metricCode: 'sales', month: currentMonth, value: '', sourceName: 'Carga administrativa', sourceReference: '', qualityStatus: 'provisional' })
  const [rule, setRule] = useState({ code: '', label: '', metricCode: 'sales', comparison: 'lt', threshold: '', severity: 'warning', scopeType: 'all', responsibleRole: 'director' })

  async function load() {
    setLoading(true)
    const response = await fetch('/api/management/admin', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) setMessage(payload.error || 'No fue posible cargar administración.')
    else {
      setData(payload)
      const first = payload.entities?.[0]?.id || ''
      setGoal((value) => ({ ...value, entityId: value.entityId || first }))
      setMetric((value) => ({ ...value, entityId: value.entityId || first }))
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function post(body: unknown) {
    setMessage(null)
    const response = await fetch('/api/management/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'No fue posible guardar.')
    setMessage('Cambios guardados correctamente.')
    await load()
  }

  async function updateAlert(id: string, action: string) {
    const notes = action === 'resolve' || action === 'dismiss' ? window.prompt('Notas de resolución') || '' : ''
    const response = await fetch('/api/management/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, notes }) })
    const payload = await response.json()
    if (!response.ok) setMessage(payload.error || 'No fue posible actualizar la alerta.')
    else { setMessage('Alerta actualizada.'); await load() }
  }

  const openAlerts = useMemo(() => data?.alerts.filter((alert) => ['open', 'acknowledged'].includes(alert.status)) ?? [], [data])

  return (
    <IntelligencePage>
      <IntelligenceHeader eyebrow="Módulo III · Administración" title="Metas, métricas y alertas" description="Configuración contractual, carga controlada y trazabilidad de cambios del control de gestión." actions={[{ label: 'Conciliación', href: '/dashboard/control/reconciliacion' }, { label: 'Volver a control', href: '/dashboard/control', primary: true }]} />

      {message ? <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4 text-sm text-[var(--n3-text-light)]">{message}</div> : null}
      {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando…</div> : null}

      {!loading && data ? <>
        <section>
          <SectionHeading eyebrow="01 · Metas" title="Meta aprobada por entidad y período" />
          <IntelligencePanel eyebrow="Registro" title="Crear o actualizar meta" description="La combinación entidad, métrica y período se actualiza sin duplicados.">
            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
              <select value={goal.entityId} onChange={(e) => setGoal({ ...goal, entityId: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3"><option value="">Entidad</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.entity_type}</option>)}</select>
              <select value={goal.metricCode} onChange={(e) => setGoal({ ...goal, metricCode: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3">{data.definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select>
              <input type="month" value={goal.month} onChange={(e) => setGoal({ ...goal, month: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <input type="number" value={goal.targetValue} onChange={(e) => setGoal({ ...goal, targetValue: e.target.value })} placeholder="Valor meta" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <button onClick={() => { const bounds = monthBounds(goal.month); void post({ type: 'goal', ...goal, periodStart: bounds.start, periodEnd: bounds.end }) }} className="flex items-center justify-center gap-2 border border-[#d7332b] p-3"><Save size={15} />Guardar meta</button>
            </div>
          </IntelligencePanel>
          <div className="mt-4 overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[800px] w-full text-sm"><thead className="bg-[#080d0d]"><tr><th className="p-3 text-left">Entidad</th><th className="p-3 text-left">Métrica</th><th className="p-3 text-left">Período</th><th className="p-3 text-right">Meta</th></tr></thead><tbody>{data.goals.map((item) => <tr key={item.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{item.management_entities?.name ?? item.entity_id}</td><td className="p-3">{item.management_metric_definitions?.label ?? item.metric_code}</td><td className="p-3">{item.period_start} — {item.period_end}</td><td className="p-3 text-right">{Number(item.target_value).toLocaleString('es-CL')}</td></tr>)}</tbody></table></div>
        </section>

        <section>
          <SectionHeading eyebrow="02 · Evidencia de fuente" title="Registrar métrica para conciliación" />
          <IntelligencePanel eyebrow="Dato operativo" title="Carga manual no publicada" description="La carga queda como evidencia independiente. No alimenta dashboards hasta ser comparada con el cálculo canónico y aprobada por CEO.">
            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
              <select value={metric.entityId} onChange={(e) => setMetric({ ...metric, entityId: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3">{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select>
              <select value={metric.metricCode} onChange={(e) => setMetric({ ...metric, metricCode: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3">{data.definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select>
              <input type="month" value={metric.month} onChange={(e) => setMetric({ ...metric, month: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <input type="number" value={metric.value} onChange={(e) => setMetric({ ...metric, value: e.target.value })} placeholder="Valor" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <input value={metric.sourceName} onChange={(e) => setMetric({ ...metric, sourceName: e.target.value })} placeholder="Fuente" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <input value={metric.sourceReference} onChange={(e) => setMetric({ ...metric, sourceReference: e.target.value })} placeholder="Referencia de archivo/corte" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <select value={metric.qualityStatus} onChange={(e) => setMetric({ ...metric, qualityStatus: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3"><option value="provisional">Provisional</option><option value="verified">Fuente verificada</option></select>
              <button onClick={() => { const bounds = monthBounds(metric.month); void post({ type: 'metric', ...metric, periodStart: bounds.start, periodEnd: bounds.end }) }} className="flex items-center justify-center gap-2 border border-[#d7332b] p-3"><Database size={15} />Registrar evidencia</button>
            </div>
          </IntelligencePanel>
        </section>

        <section>
          <SectionHeading eyebrow="03 · Reglas" title="Reglas de alertas contractuales" />
          <IntelligencePanel eyebrow="Configuración CEO" title="Crear o actualizar regla" description="El código identifica la regla y permite actualizarla sin perder trazabilidad.">
            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
              <input value={rule.code} onChange={(e) => setRule({ ...rule, code: e.target.value })} placeholder="Código" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <input value={rule.label} onChange={(e) => setRule({ ...rule, label: e.target.value })} placeholder="Nombre de regla" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <select value={rule.metricCode} onChange={(e) => setRule({ ...rule, metricCode: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3">{data.definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select>
              <select value={rule.comparison} onChange={(e) => setRule({ ...rule, comparison: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3"><option value="lt">Menor que</option><option value="lte">Menor o igual</option><option value="gt">Mayor que</option><option value="gte">Mayor o igual</option><option value="drop_pct">Caída porcentual</option><option value="increase_pct">Aumento porcentual</option></select>
              <input type="number" value={rule.threshold} onChange={(e) => setRule({ ...rule, threshold: e.target.value })} placeholder="Umbral" className="border border-[var(--n3-line)] bg-[#080d0d] p-3" />
              <select value={rule.severity} onChange={(e) => setRule({ ...rule, severity: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3"><option value="info">Informativa</option><option value="warning">Advertencia</option><option value="critical">Crítica</option></select>
              <select value={rule.scopeType} onChange={(e) => setRule({ ...rule, scopeType: e.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] p-3"><option value="all">Todos</option><option value="company">Compañía</option><option value="office">Oficina</option><option value="team">Equipo</option><option value="partner">Partner</option><option value="agent">Agente</option></select>
              <button onClick={() => void post({ type: 'rule', ...rule })} className="flex items-center justify-center gap-2 border border-[#d7332b] p-3"><Target size={15} />Guardar regla</button>
            </div>
          </IntelligencePanel>
        </section>

        <section>
          <SectionHeading eyebrow="04 · Alertas" title="Bandeja de atención y resolución" />
          <div className="space-y-3">{openAlerts.length ? openAlerts.map((alert) => <div key={alert.id} className={`border p-4 ${alert.severity === 'critical' ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}><div className="flex flex-col justify-between gap-4 md:flex-row"><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 text-[#ff766f]" /><div><p className="font-semibold">{alert.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{alert.management_entities?.name ?? 'Entidad'} · {alert.severity} · {alert.status}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{alert.detail}</p></div></div><div className="flex gap-2"><button onClick={() => void updateAlert(alert.id, 'acknowledge')} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Reconocer</button><button onClick={() => void updateAlert(alert.id, 'resolve')} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Resolver</button><button onClick={() => void updateAlert(alert.id, 'dismiss')} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Descartar</button></div></div></div>) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No hay alertas abiertas.</div>}</div>
        </section>

        <section>
          <SectionHeading eyebrow="05 · Ejecuciones" title="Historial de cargas" />
          <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[850px] w-full text-sm"><thead className="bg-[#080d0d]"><tr><th className="p-3 text-left">Fuente</th><th className="p-3 text-left">Período</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Recibidas</th><th className="p-3 text-right">Insertadas</th><th className="p-3 text-right">Actualizadas</th><th className="p-3 text-right">Rechazadas</th></tr></thead><tbody>{data.imports.map((run) => <tr key={run.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{run.source_name}</td><td className="p-3">{run.period_start} — {run.period_end}</td><td className="p-3">{run.status}</td><td className="p-3 text-right">{run.rows_received}</td><td className="p-3 text-right">{run.rows_inserted}</td><td className="p-3 text-right">{run.rows_updated}</td><td className="p-3 text-right">{run.rows_rejected}</td></tr>)}</tbody></table></div>
        </section>
      </> : null}
    </IntelligencePage>
  )
}
