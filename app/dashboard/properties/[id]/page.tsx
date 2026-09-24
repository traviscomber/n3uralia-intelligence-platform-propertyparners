'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { DecisionTrace } from '@/components/intelligence/decision-trace'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import type { DecisionTraceItem } from '@/lib/intelligence-decision-trace'

type Comparable = {
  propertyId: string
  address: string | null
  areaM2: number | null
  bedrooms: number | null
  bathrooms: number | null
  priceUf: number | null
  priceUfM2: number | null
  observedAt: string | null
  sourceReportedDom: number | null
  identityStatus: string | null
  identityConfidence: number | null
  url: string | null
}

type Intelligence = {
  property: {
    id: string
    requestedId: string
    canonicalKey: string
    address: string | null
    neighborhood: string | null
    propertyType: string | null
    areaM2: number | null
    bedrooms: number | null
    bathrooms: number | null
    parkingSpaces: number | null
    identityStatus: string
    identityConfidence: number | null
  }
  sourceEvidence: {
    legacyPropertyId: string | null
    source: string | null
    sourceUrl: string | null
    sourceReportedDom: number | null
    sourceReportedDomOrigin: string | null
    description: string | null
  }
  currentMarket: {
    status: string | null
    priceUf: number | null
    priceUfM2: number | null
    observedAt: string | null
    evidenceAgeDays: number | null
    sourceReportedDom: number | null
    observedSpanDays: number | null
    openAgeSinceFirstObservation: number | null
    confirmedDom: number | null
  }
  lifecycle: {
    firstObservedAt: string | null
    lastObservedAt: string | null
    firstPublishedAt: string | null
    removedAt: string | null
    firstConfirmedSaleDate: string | null
    distinctPriceCount: number
    observations: number
    transactions: number
  }
  comparables: {
    count: number
    minimumRequired: number
    decisionEligible: boolean
    sourceDomCoverage?: number
    priceUfM2: { p25: number | null; median: number | null; p75: number | null }
    medianSourceReportedDom: number | null
    impliedPriceAtMedian: number | null
    priceVsMedianPct: number | null
    domVsMedianMultiple: number | null
    methodology: string
    quality?: {
      score: number
      label: string
      freshCount: number
      confirmedIdentityCount: number
      sourceDomCount: number
      freshnessCoverage: number
      identityCoverage: number
      domCoverage: number
      relativeIqrPct: number | null
    }
    rows: Comparable[]
  }
  priceConsistency?: {
    firstPriceUf: number | null
    latestPriceUf: number | null
    changePct: number | null
    maxSequentialChangePct: number | null
    distinctPriceCount: number
  }
  anomalies?: Array<{ id: string; severity: 'warning' | 'info'; label: string; detail: string }>
  decisionTrace?: DecisionTraceItem[]
  identityMatches: Array<{ id: string; score: number; status: string }>
  signals: { pricePosition: string; marketStagnation: string; freshness: string; identity: string }
  recommendation: string
  missingEvidence: string[]
  confidence: number
  confidenceLabel: string
  generatedAt: string
}

const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const n0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
function number(value: number | null | undefined, digits = 1) { return value == null ? '—' : (digits === 0 ? n0 : nf).format(value) }
function uf(value: number | null | undefined) { return value == null ? '—' : `${n0.format(value)} UF` }
function pct(value: number | null | undefined) { return value == null ? '—' : `${value > 0 ? '+' : ''}${nf.format(value)}%` }
function date(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString('es-CL') : '—' }
function confidenceLabel(value: string) { return value === 'high' ? 'Alta' : value === 'medium' ? 'Media' : 'Baja' }
function signalLabel(value: string) {
  const labels: Record<string, string> = { below_market: 'Bajo mercado', above_market: 'Sobre mercado', near_market: 'En rango', high: 'Alto', medium: 'Medio', low: 'Bajo', current: 'Vigente', stale: 'Desactualizada', very_stale: 'Muy desactualizada', unknown: 'Sin evidencia', confirmed: 'Confirmada', candidate: 'Candidata', needs_review: 'Revisar' }
  return labels[value] ?? value
}

export default function PropertyIntelligencePage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id ?? '')
  const [data, setData] = useState<Intelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true); setError(false)
    try {
      const response = await fetch(`/api/market/property-intelligence/${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('LOAD_FAILED')
      setData(await response.json())
    } catch { setData(null); setError(true) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [id])

  if (loading) return <WorkspaceShell><OperationalState kind="loading" title="Analizando propiedad" description="Resolviendo identidad, publicaciones, lifecycle y comparables." /></WorkspaceShell>
  if (error || !data) return <WorkspaceShell><OperationalState kind="error" title="No fue posible analizar la propiedad" description="La evidencia no pudo ser consultada." action={{ label: 'Volver a propiedades', href: '/dashboard/properties' }} /></WorkspaceShell>

  const stale = data.signals.freshness !== 'current'
  const issues = data.missingEvidence.length
  const dataStatus = data.confidenceLabel === 'high' && !issues ? 'ready' : data.confidenceLabel === 'low' ? 'blocked' : 'partial'
  const externalSource = data.sourceEvidence.source || 'mercado externo'
  const comparableQuality = data.comparables.quality

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Inteligencia de propiedad · Mercado externo"
      title={data.property.address || 'Propiedad'}
      meta={`${data.property.neighborhood || 'Sin barrio'} · evidencia ${date(data.currentMarket.observedAt)}`}
      actions={[
        { label: 'Propiedades', href: '/dashboard/properties', icon: <ArrowLeft size={14} /> },
        { label: 'Actualizar', onClick: () => void load(), icon: <RefreshCw size={14} />, ariaLabel: 'Actualizar análisis' },
      ]}
    />

    <section className="mb-5 border-y border-[var(--n3-line)] py-3 text-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <strong className="font-semibold text-[var(--n3-text-light)]">Dominio de evidencia: mercado externo</strong>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Fuente: {externalSource}. Esta ficha analiza publicación, identidad, precio, DOM y comparables de mercado. No atribuye leads, visitas, ofertas ni cierres del CRM de Property Partners mientras no exista un vínculo canónico explícito.</p>
        </div>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-[#f0c96a]">CRM interno no enlazado</span>
      </div>
    </section>

    <MetricStrip items={[
      { label: 'Precio', value: uf(data.currentMarket.priceUf) },
      { label: 'UF/m²', value: number(data.currentMarket.priceUfM2), detail: data.comparables.decisionEligible ? `Mediana ${number(data.comparables.priceUfM2.median)}` : `Muestra ${data.comparables.count}/${data.comparables.minimumRequired}` },
      { label: 'Posición', value: data.comparables.decisionEligible ? pct(data.comparables.priceVsMedianPct) : 'No evaluable', detail: data.comparables.decisionEligible ? undefined : `Requiere ≥${data.comparables.minimumRequired} comparables`, tone: data.signals.pricePosition === 'above_market' ? 'warning' : 'default' },
      { label: 'Confianza', value: confidenceLabel(data.confidenceLabel), detail: `${number(data.confidence * 100, 0)}%`, tone: data.confidenceLabel === 'high' ? 'success' : data.confidenceLabel === 'low' ? 'danger' : 'warning' },
    ]} />

    <section className="mt-6 border-y border-[var(--n3-line)] py-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.7fr)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Recomendación de mercado</p>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[var(--n3-text-light)]">{data.recommendation}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">La recomendación se limita a evidencia de mercado. Cualquier diagnóstico de gestión comercial interna requiere una propiedad CRM enlazada canónicamente.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Precio</span><strong>{signalLabel(data.signals.pricePosition)}</strong></div>
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Estancamiento</span><strong>{signalLabel(data.signals.marketStagnation)}</strong></div>
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Vigencia</span><strong>{signalLabel(data.signals.freshness)}</strong></div>
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Identidad</span><strong>{signalLabel(data.signals.identity)}</strong></div>
        </div>
      </div>
    </section>

    {data.decisionTrace?.length ? <DecisionTrace items={data.decisionTrace} title="Trazabilidad de recomendación" /> : null}

    <section className="mt-7">
      <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Tiempo y trazabilidad</h2></div>
      <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">DOM reportado por fuente</span><strong className="mt-2 block text-xl">{data.currentMarket.sourceReportedDom == null ? '—' : `${number(data.currentMarket.sourceReportedDom, 0)} d`}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Mediana comparable {data.comparables.medianSourceReportedDom == null ? '—' : `${number(data.comparables.medianSourceReportedDom)} d`}{data.comparables.domVsMedianMultiple == null ? '' : ` · ${number(data.comparables.domVsMedianMultiple)}×`}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Ventana observada</span><strong className="mt-2 block text-xl">{data.currentMarket.observedSpanDays == null ? '—' : `${number(data.currentMarket.observedSpanDays, 0)} d`}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Primera → última evidencia</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Edad desde primera evidencia</span><strong className="mt-2 block text-xl">{data.currentMarket.openAgeSinceFirstObservation == null ? '—' : `${number(data.currentMarket.openAgeSinceFirstObservation, 0)} d`}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Sólo si sigue marcada activa</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">DOM confirmado al cierre</span><strong className="mt-2 block text-xl">{data.currentMarket.confirmedDom == null ? '—' : `${number(data.currentMarket.confirmedDom, 0)} d`}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Requiere transacción</p></div>
      </div>
      {stale ? <p className="mt-3 text-xs text-[#f0c96a]">La última observación tiene {number(data.currentMarket.evidenceAgeDays, 0)} días; el estado de publicación requiere revalidación.</p> : null}
    </section>

    <section className="mt-7">
      <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-2"><div><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Comparables de mercado</h2><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{data.comparables.methodology}</p></div><span className="text-sm font-semibold tabular-nums">{data.comparables.count}</span></div>
      {data.comparables.decisionEligible ? <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div><span className="text-xs text-[var(--n3-text-muted)]">P25</span><strong className="block">{number(data.comparables.priceUfM2.p25)} UF/m²</strong></div>
        <div><span className="text-xs text-[var(--n3-text-muted)]">Mediana</span><strong className="block">{number(data.comparables.priceUfM2.median)} UF/m²</strong></div>
        <div><span className="text-xs text-[var(--n3-text-muted)]">P75</span><strong className="block">{number(data.comparables.priceUfM2.p75)} UF/m²</strong></div>
        <div><span className="text-xs text-[var(--n3-text-muted)]">Precio implícito</span><strong className="block">{uf(data.comparables.impliedPriceAtMedian)}</strong></div>
      </div> : <div className="mt-3 border-y border-[var(--n3-line)] py-3">
        <p className="text-sm font-medium text-[var(--n3-text-light)]">Muestra insuficiente para una conclusión de precio.</p>
        <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Hay {data.comparables.count} comparables válidos y el mínimo decisional es {data.comparables.minimumRequired}. Las publicaciones se conservan abajo como evidencia, pero no generan mediana, posición ni precio implícito operativo.</p>
      </div>}
      {comparableQuality ? <div className="mt-4 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4" aria-label="Calidad de comparables">
        <div className="bg-[var(--n3-deep)] p-3"><span className="text-xs text-[var(--n3-text-muted)]">Calidad</span><strong className="mt-1 block">{confidenceLabel(comparableQuality.label)} · {number(comparableQuality.score * 100, 0)}%</strong></div>
        <div className="bg-[var(--n3-deep)] p-3"><span className="text-xs text-[var(--n3-text-muted)]">Vigentes ≤30d</span><strong className="mt-1 block">{comparableQuality.freshCount}/{data.comparables.count}</strong></div>
        <div className="bg-[var(--n3-deep)] p-3"><span className="text-xs text-[var(--n3-text-muted)]">Identidad confirmada</span><strong className="mt-1 block">{comparableQuality.confirmedIdentityCount}/{data.comparables.count}</strong></div>
        <div className="bg-[var(--n3-deep)] p-3"><span className="text-xs text-[var(--n3-text-muted)]">Dispersión IQR</span><strong className="mt-1 block">{comparableQuality.relativeIqrPct == null ? '—' : `${number(comparableQuality.relativeIqrPct)}%`}</strong></div>
      </div> : null}
      <div className="mt-4 overflow-x-auto border-t border-[var(--n3-line)]"><table className="w-full min-w-[820px] text-sm"><thead className="border-b border-[var(--n3-line)] text-xs text-[var(--n3-text-muted)]"><tr><th className="py-3 text-left">Comparable</th><th className="px-3 py-3 text-right">m²</th><th className="px-3 py-3 text-right">UF</th><th className="px-3 py-3 text-right">UF/m²</th><th className="px-3 py-3 text-right">DOM fuente</th><th className="px-3 py-3 text-left">Identidad</th><th className="py-3 text-right">Fuente</th></tr></thead><tbody>{data.comparables.rows.map((item) => <tr key={item.propertyId} className="border-b border-[var(--n3-line)]"><td className="max-w-[360px] truncate py-3 pr-3">{item.address || item.propertyId}</td><td className="px-3 py-3 text-right tabular-nums">{number(item.areaM2, 0)}</td><td className="px-3 py-3 text-right tabular-nums">{number(item.priceUf, 0)}</td><td className="px-3 py-3 text-right tabular-nums">{number(item.priceUfM2)}</td><td className="px-3 py-3 text-right tabular-nums">{item.sourceReportedDom == null ? '—' : number(item.sourceReportedDom, 0)}</td><td className="px-3 py-3">{signalLabel(item.identityStatus || 'unknown')}</td><td className="py-3 text-right">{item.url ? <a href={item.url} target="_blank" rel="noreferrer" aria-label="Abrir fuente" className="inline-flex items-center gap-1 text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Abrir<ExternalLink size={12}/></a> : '—'}</td></tr>)}</tbody></table></div>
    </section>

    {data.anomalies?.length ? <section className="mt-7">
      <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Anomalías de evidencia</h2></div>
      <div className="divide-y divide-[var(--n3-line)]">{data.anomalies.map((item) => <div key={item.id} className="py-3"><p className={item.severity === 'warning' ? 'text-sm font-semibold text-[#f0c96a]' : 'text-sm font-semibold'}>{item.label}</p><p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{item.detail}</p></div>)}</div>
    </section> : null}

    <section className="mt-7">
      <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Evidencia faltante para este dominio</h2></div>
      {data.missingEvidence.length ? <div className="divide-y divide-[var(--n3-line)]">{data.missingEvidence.map((item) => <p key={item} className="py-3 text-sm text-[var(--n3-text-muted)]">{item}</p>)}</div> : <OperationalState compact kind="success" title="Evidencia de mercado completa" description="No se detectaron brechas para este análisis de mercado." />}
      <div className="mt-4 border-t border-[var(--n3-line)] pt-4">
        <p className="text-xs leading-5 text-[var(--n3-text-muted)]"><strong className="text-[var(--n3-text-light)]">Fuera de este dominio:</strong> leads, requerimientos, visitas, ofertas, feedback y cierres internos deben provenir del CRM canónico de Property Partners y sólo se mostrarán cuando exista un identificador canónico que vincule ambos expedientes.</p>
      </div>
    </section>

    <div className="mt-7"><Link href="/dashboard/market" className="text-sm text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver contexto de mercado →</Link></div>

    <DataStatusBar cutoff={date(data.currentMarket.observedAt)} coverage={`${data.comparables.count} comparables · confianza ${number(data.confidence * 100, 0)}%`} issues={issues} status={dataStatus} />
  </WorkspaceShell>
}