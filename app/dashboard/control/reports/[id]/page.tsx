'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'

type ReportMetric = {
  code?: string
  label?: string
  value?: string | number | null
  sourceName?: string
  source_name?: string
  qualityStatus?: string
  quality_status?: string
}

type ReportEntity = {
  id: string
  name: string
  entityType?: string
  entity_type?: string
  metrics?: ReportMetric[]
}

type ReportAlert = {
  id: string
  title: string
  detail: string
  severity: string
}

type Delta = { value?: number | null; unit?: '%' | 'pp' }
type ComparisonMetric = { current?: number | null; previous?: number | null; delta?: Delta | null }
type TargetComparison = {
  actual?: number | null
  target?: number | null
  attainmentPct?: number | null
  gap?: number | null
  status?: string | null
  sourceName?: string | null
  officialForScoring?: boolean
}

type CanonicalComparisons = {
  mom?: {
    status?: string
    previousPeriod?: string
    metrics?: { closures?: ComparisonMetric; leads?: ComparisonMetric; creditedUf?: ComparisonMetric } | null
  }
  targets?: {
    current?: { sales?: TargetComparison; leads?: TargetComparison }
    ytd?: { closures?: number | null; target?: number | null; attainmentPct?: number | null; goalStatus?: string; officialForScoring?: boolean }
  }
  yoy?: {
    status?: string
    period?: string
    source?: string | null
    dimension?: string | null
    closures?: ComparisonMetric
    salesUf?: ComparisonMetric
  }
  operationalYoyYtd?: {
    status?: string
    periodStart?: string
    periodEnd?: string
    source?: string | null
    closures?: ComparisonMetric
    salesUf?: ComparisonMetric
  } | null
}

type ReportSnapshot = {
  entities?: ReportEntity[]
  alerts?: ReportAlert[]
  period?: string | { label?: string }
  profile?: { role?: string }
  company?: {
    cierresAcreditados?: number | null
    volumenUfAcreditado?: number | null
    volumenUfBruto?: number | null
    leadsNuevos?: number | null
    visitasAgendadas?: number | null
    visitasRealizadas?: number | null
  }
  comparisons?: CanonicalComparisons
}

type Report = {
  id: string
  report_type: string
  period_start: string
  period_end: string
  status: string
  generated_at: string
  snapshot: ReportSnapshot
}

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const format = (value: unknown, digits = 1) => {
  const numeric = number(value)
  return numeric == null ? 'n/d' : numeric.toLocaleString('es-CL', { maximumFractionDigits: digits })
}
const signed = (value: unknown, digits = 1) => {
  const numeric = number(value)
  if (numeric == null) return 'n/d'
  return `${numeric > 0 ? '+' : ''}${numeric.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`
}

export default function PrintableManagementReportPage() {
  const params = useParams<{ id: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadReport() {
      setLoadFailed(false)
      setReport(null)

      try {
        const response = await fetch(`/api/management/reports/${params.id}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = (await response.json()) as { report?: Report }
        if (!response.ok || !data.report) throw new Error('REPORT_UNAVAILABLE')
        setReport(data.report)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadFailed(true)
      }
    }

    void loadReport()
    return () => controller.abort()
  }, [params.id])

  const entities = useMemo(() => report?.snapshot.entities ?? [], [report])
  const alerts = useMemo(() => report?.snapshot.alerts ?? [], [report])

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <PublicErrorNotice code="DATA_UNAVAILABLE" title="Reporte no disponible" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-4xl p-8" role="status" aria-live="polite">
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5 text-sm text-[var(--n3-text-muted)]">
          Cargando reporte…
        </div>
      </div>
    )
  }

  const company = report.snapshot.company ?? {}
  const comparisons = report.snapshot.comparisons
  const salesTarget = comparisons?.targets?.current?.sales
  const ytd = comparisons?.targets?.ytd
  const momClosures = comparisons?.mom?.metrics?.closures
  const momDelta = momClosures?.delta?.value
  const yoyClosures = comparisons?.yoy?.closures
  const yoySalesUf = comparisons?.yoy?.salesUf
  const yoyYtd = comparisons?.operationalYoyYtd
  const creditedUf = company.volumenUfAcreditado ?? company.volumenUfBruto
  const periodLabel = typeof report.snapshot.period === 'object'
    ? report.snapshot.period?.label ?? report.period_start.slice(0, 7)
    : report.snapshot.period ?? report.period_start.slice(0, 7)

  return (
    <main className="mx-auto max-w-6xl bg-white p-8 text-black print:max-w-none print:p-0">
      <div className="mb-8 flex items-start justify-between gap-6 border-b border-black pb-5 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.18em]">Módulo III · Reporte contractual</p>
          <h1 className="mt-2 text-3xl font-semibold">{report.report_type}</h1>
        </div>
        <div className="flex gap-2">
          <a href={`/api/management/reports/${report.id}/artifact`} className="bg-black px-4 py-2 text-sm text-white">Descargar PDF</a>
          <button onClick={() => window.print()} className="border border-black px-4 py-2 text-sm">Imprimir</button>
        </div>
      </div>

      <header className="mb-8 border-b-2 border-black pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d7332b]">Property Partners</p>
        <h1 className="mt-3 font-serif text-5xl">Reporte {report.report_type}</h1>
        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <p><strong>Período:</strong> {report.period_start} — {report.period_end}</p>
          <p><strong>Estado:</strong> {report.status}</p>
          <p><strong>Generado:</strong> {new Date(report.generated_at).toLocaleString('es-CL')}</p>
        </div>
      </header>

      <section className="mb-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7332b]">Lectura ejecutiva</p>
            <h2 className="mt-1 font-serif text-3xl">{periodLabel}</h2>
          </div>
          <p className="max-w-xl text-right text-sm text-neutral-600">La comparación usa cierres acreditados. Operaciones brutas y crédito de gestión se mantienen como dimensiones separadas.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-black bg-[#050807] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.12em] text-neutral-400">Cierres acreditados</p>
            <p className="mt-3 font-serif text-4xl">{format(company.cierresAcreditados)}</p>
            <p className="mt-2 text-xs text-neutral-400">Volumen acreditado: {format(creditedUf, 0)} UF</p>
          </div>
          <div className="border border-black p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Vs. meta documentada</p>
            <p className="mt-3 font-serif text-4xl">{salesTarget?.attainmentPct == null ? 'n/d' : `${format(salesTarget.attainmentPct)}%`}</p>
            <p className="mt-2 text-xs text-neutral-600">{format(salesTarget?.actual)} / {format(salesTarget?.target)} cierres</p>
            {salesTarget?.target != null && !salesTarget.officialForScoring ? <p className="mt-2 text-xs font-medium text-[#a62721]">Referencia documental · no scoring oficial</p> : null}
          </div>
          <div className="border border-black p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">MoM · cierres acreditados</p>
            <p className="mt-3 font-serif text-4xl">{comparisons?.mom?.status === 'exact' ? signed(momDelta) : 'n/d'}</p>
            <p className="mt-2 text-xs text-neutral-600">{comparisons?.mom?.status === 'exact' ? `${format(momClosures?.previous)} → ${format(momClosures?.current)} cierres vs ${comparisons.mom.previousPeriod}` : 'Sin mes anterior canónico comparable'}</p>
          </div>
          <div className="border border-black p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Acumulado YTD</p>
            <p className="mt-3 font-serif text-4xl">{ytd?.attainmentPct == null ? 'n/d' : `${format(ytd.attainmentPct)}%`}</p>
            <p className="mt-2 text-xs text-neutral-600">{format(ytd?.closures)} / {format(ytd?.target)} cierres</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="border-l-4 border-[#d7332b] bg-neutral-100 px-4 py-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">YoY mensual · operación corporativa</p>
            {comparisons?.yoy?.status === 'exact_operational'
              ? <div className="mt-2">
                  <p className="text-2xl font-semibold">{signed(yoyClosures?.delta?.value)} <span className="text-sm font-normal text-neutral-500">cierres</span></p>
                  <p className="mt-1 text-neutral-700">{format(yoyClosures?.previous)} → {format(yoyClosures?.current)} vs {comparisons.yoy.period}</p>
                  <p className="mt-1 text-neutral-600">{signed(yoySalesUf?.delta?.value)} UF · {format(yoySalesUf?.previous,0)} → {format(yoySalesUf?.current,0)} UF</p>
                  <p className="mt-2 text-xs text-neutral-500">Comparación operacional. El crédito de gestión 2025 no existe como dimensión histórica equivalente.</p>
                </div>
              : <p className="mt-2 text-neutral-600">Sin período comparable canonicalizado. No se infiere YoY desde agregados incompatibles.</p>}
          </div>
          <div className="border-l-4 border-black bg-neutral-100 px-4 py-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">YoY acumulado · operación corporativa</p>
            {yoyYtd?.status === 'exact_operational'
              ? <div className="mt-2">
                  <p className="text-2xl font-semibold">{signed(yoyYtd.closures?.delta?.value)} <span className="text-sm font-normal text-neutral-500">cierres YTD</span></p>
                  <p className="mt-1 text-neutral-700">{format(yoyYtd.closures?.previous)} → {format(yoyYtd.closures?.current)} cierres</p>
                  <p className="mt-1 text-neutral-600">{signed(yoyYtd.salesUf?.delta?.value)} UF · {format(yoyYtd.salesUf?.previous,0)} → {format(yoyYtd.salesUf?.current,0)} UF</p>
                  <p className="mt-2 text-xs text-neutral-500">Mismo corte acumulado del año anterior.</p>
                </div>
              : <p className="mt-2 text-neutral-600">Sin acumulado comparable canonicalizado para el período.</p>}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Resumen operacional</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-black p-4"><p className="text-xs uppercase">Leads nuevos</p><p className="mt-2 text-3xl font-semibold">{format(company.leadsNuevos, 0)}</p></div>
          <div className="border border-black p-4"><p className="text-xs uppercase">Visitas agendadas</p><p className="mt-2 text-3xl font-semibold">{format(company.visitasAgendadas, 0)}</p></div>
          <div className="border border-black p-4"><p className="text-xs uppercase">Visitas realizadas</p><p className="mt-2 text-3xl font-semibold">{format(company.visitasRealizadas, 0)}</p></div>
          <div className="border border-black p-4"><p className="text-xs uppercase">Alertas abiertas</p><p className="mt-2 text-3xl font-semibold">{alerts.length}</p></div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Resultados por entidad</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr>{['Entidad', 'Tipo', 'Métrica', 'Valor', 'Fuente', 'Calidad'].map((item) => <th key={item} className="border border-black p-2 text-left">{item}</th>)}</tr></thead>
            <tbody>
              {entities.flatMap((entity) => (entity.metrics ?? []).map((metric) => (
                <tr key={`${entity.id}-${metric.code ?? metric.label ?? 'metric'}`}>
                  <td className="border border-black p-2">{entity.name}</td>
                  <td className="border border-black p-2">{entity.entityType ?? entity.entity_type ?? 'n/d'}</td>
                  <td className="border border-black p-2">{metric.label ?? metric.code ?? 'n/d'}</td>
                  <td className="border border-black p-2">{metric.value ?? 'n/d'}</td>
                  <td className="border border-black p-2">{metric.sourceName ?? metric.source_name ?? 'Pendiente'}</td>
                  <td className="border border-black p-2">{metric.qualityStatus ?? metric.quality_status ?? 'sin datos'}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Alertas y excepciones</h2>
        {alerts.length ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <article key={alert.id} className="border border-black p-4">
                <div className="flex justify-between gap-4"><strong>{alert.title}</strong><span className="uppercase">{alert.severity}</span></div>
                <p className="mt-2 text-sm">{alert.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="border border-black p-4 text-sm">No hay alertas abiertas registradas para este snapshot.</p>
        )}
      </section>

      <footer className="mt-12 border-t border-black pt-4 text-xs">
        <p>Documento generado desde evidencia canónica. Las metas documentadas pueden mostrarse como comparación informativa aunque permanezcan fuera del scoring oficial hasta su aprobación formal.</p>
        <p className="mt-2">Identificador: {report.id}</p>
      </footer>
    </main>
  )
}
