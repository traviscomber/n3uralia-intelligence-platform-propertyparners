'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Mail, Play, RefreshCw, ShieldAlert } from 'lucide-react'
import { IntelligencePanel, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'
import { OperationalState } from '@/components/ui/operational-state'

type Distribution = {
  id: string
  recipient: string
  channel: string
  status: string
  attempt_count: number
  next_attempt_at: string | null
  last_attempt_at: string | null
  provider: string | null
  provider_message_id: string | null
  error_message: string | null
  sent_at: string | null
  acknowledged_at: string | null
  created_at: string
}

type Report = {
  id: string
  report_type: string
  entity_id: string | null
  period_start: string
  period_end: string
  status: string
  generated_at: string
  distributed_at: string | null
  distribution_reference: string | null
  management_report_distributions?: Distribution[]
}

type ReportsResponse = {
  reports?: Report[]
  delivery?: { configured: boolean; provider: string | null }
  error?: string
}

const reportLabels: Record<string, string> = {
  executive: 'Ejecutivo',
  office: 'Oficina',
  partner: 'Partner',
  monthly: 'Mensual',
  cumulative: 'Acumulado',
}

function dateTime(value: string | null | undefined) {
  if (!value) return 'n/d'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    generated: 'Generado',
    distributed: 'Distribuido',
    failed: 'Fallido',
    pending: 'Pendiente',
    processing: 'Procesando',
    sent: 'Enviado',
    acknowledged: 'Confirmado',
  }
  return labels[value] ?? value
}

export function ReportDeliveryConsole({ canOperate }: { canOperate: boolean }) {
  const [reports, setReports] = useState<Report[]>([])
  const [delivery, setDelivery] = useState({ configured: false, provider: null as string | null })
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [action, setAction] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/management/reports', { cache: 'no-store' })
      const payload = await response.json() as ReportsResponse
      if (!response.ok) throw new Error(payload.error || 'No fue posible cargar los reportes.')
      setReports(payload.reports ?? [])
      setDelivery(payload.delivery ?? { configured: false, provider: null })
      setHasLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function execute(endpoint: string, name: string) {
    setAction(name)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.endsWith('/deliver') ? JSON.stringify({ limit: 50 }) : undefined,
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'La operación falló.')
      if (endpoint.endsWith('/deliver')) {
        setMessage(payload.configured
          ? `Cola procesada: ${payload.sent ?? 0} enviados, ${payload.failed ?? 0} reintentos y ${payload.terminal ?? 0} fallos terminales.`
          : payload.reason || 'Proveedor de correo no configurado.')
      } else {
        setMessage(`Programaciones procesadas: ${payload.schedulesProcessed ?? 0}; fallidas: ${payload.schedulesFailed ?? 0}.`)
      }
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La operación falló.')
    } finally {
      setAction(null)
    }
  }

  const distributions = useMemo(() => reports.flatMap((report) => report.management_report_distributions ?? []), [reports])
  const pending = distributions.filter((item) => ['pending', 'processing'].includes(item.status)).length
  const failed = distributions.filter((item) => item.status === 'failed').length
  const sent = distributions.filter((item) => ['sent', 'acknowledged'].includes(item.status)).length

  if (loading && !hasLoaded) {
    return <OperationalState kind="loading" title="Cargando operación de informes" description="Consultando reportes, entregas y configuración del proveedor." />
  }

  if (error && !hasLoaded) {
    return <OperationalState kind="error" title="No fue posible cargar la operación de informes" description={error}><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm font-semibold"><RefreshCw size={15}/>Reintentar</button></OperationalState>
  }

  return <div className="space-y-10" aria-busy={loading || Boolean(action)}>
    <section>
      <SectionHeading eyebrow="Operación" title="Generación y entrega de reportes" description="Cada ejecución conserva período, snapshot, destinatario, intentos y referencia del proveedor." />
      <MetricGrid>
        <MetricCard label="Reportes" value={String(reports.length)} detail="Ejecuciones visibles según el alcance del usuario." />
        <MetricCard label="Envíos completados" value={String(sent)} detail="Estados enviados o confirmados." />
        <MetricCard label="Cola pendiente" value={String(pending)} detail="Pendientes o en proceso." />
        <MetricCard label="Fallos" value={String(failed)} detail="Con reintento programado o terminal." />
      </MetricGrid>
    </section>

    <IntelligencePanel
      eyebrow="Delivery Control"
      title="Estado del proveedor"
      description={delivery.configured ? `Proveedor activo: ${delivery.provider}` : 'Faltan credenciales del proveedor; la cola no consume intentos.'}
      critical={!delivery.configured}
    >
      <div className="flex flex-wrap items-center gap-3 p-5">
        <span className={`inline-flex min-h-11 items-center border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${delivery.configured ? 'border-[#2f8f4e] text-[#65c780]' : 'border-[#a77a22] text-[#f6c453]'}`}>
          {delivery.configured ? 'Configurado' : 'Bloqueado por configuración'}
        </span>
        {canOperate ? <>
          <button
            type="button"
            disabled={Boolean(action) || loading}
            onClick={() => void execute('/api/management/reports/run', 'generate')}
            className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm disabled:opacity-50"
          >
            <Play size={15} />{action === 'generate' ? 'Generando…' : 'Generar vencidos'}
          </button>
          <button
            type="button"
            disabled={Boolean(action) || loading || !delivery.configured}
            onClick={() => void execute('/api/management/reports/deliver', 'deliver')}
            className="inline-flex min-h-11 items-center gap-2 border border-[#d7332b] px-4 py-2 text-sm text-[#ff766f] disabled:opacity-50"
          >
            <Mail size={15} />{action === 'deliver' ? 'Procesando…' : 'Procesar entregas'}
          </button>
        </> : null}
        <button type="button" disabled={loading || Boolean(action)} onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm disabled:opacity-50">
          <RefreshCw size={15} />{loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      {message ? <p role="status" className="border-t border-[var(--n3-line)] p-5 text-sm text-[#65c780]">{message}</p> : null}
      {error ? <p role="alert" className="border-t border-[var(--n3-line)] p-5 text-sm text-[#ff766f]">No se pudo completar la última operación. Se mantienen los últimos datos válidos visibles. {error}</p> : null}
    </IntelligencePanel>

    <section>
      <SectionHeading eyebrow="Registro" title="Ejecuciones recientes" description="El PDF se genera desde el snapshot persistido; no vuelve a calcular los datos." />
      {!loading && !reports.length ? <OperationalState compact kind="empty" title="Sin reportes generados" description="No existen reportes generados dentro de su alcance." /> : null}
      <div className="space-y-4">
        {reports.map((report) => {
          const reportDistributions = report.management_report_distributions ?? []
          return <article key={report.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">{reportLabels[report.report_type] ?? report.report_type}</p>
                <h3 className="mt-2 break-words text-lg font-semibold">{report.period_start} – {report.period_end}</h3>
                <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Generado {dateTime(report.generated_at)} · Estado {statusLabel(report.status)}</p>
              </div>
              <Link href={`/api/management/reports/${report.id}/artifact`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm">
                <Download size={15} />Descargar PDF
              </Link>
            </div>
            <div className="mt-5 space-y-2">
              {!reportDistributions.length ? <p className="text-xs text-[var(--n3-text-muted)]">Sin destinatarios registrados.</p> : reportDistributions.map((distribution) => <div key={distribution.id} className="grid gap-2 border-t border-[var(--n3-line)] py-3 text-xs md:grid-cols-[minmax(180px,1fr)_110px_90px_minmax(180px,1fr)]">
                <span className="break-all">{distribution.recipient}</span>
                <span>{statusLabel(distribution.status)}</span>
                <span>{distribution.attempt_count} intentos</span>
                <span className={`break-words ${distribution.error_message ? 'text-[#ff766f]' : 'text-[var(--n3-text-muted)]'}`}>
                  {distribution.error_message || (distribution.sent_at ? `Enviado ${dateTime(distribution.sent_at)}` : `Próximo ${dateTime(distribution.next_attempt_at)}`)}
                </span>
              </div>)}
            </div>
          </article>
        })}
      </div>
    </section>

    {!canOperate ? <div className="flex gap-3 border border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]"><ShieldAlert size={17} className="shrink-0" />La generación y el procesamiento manual están reservados a CEO y administración.</div> : null}
  </div>
}
