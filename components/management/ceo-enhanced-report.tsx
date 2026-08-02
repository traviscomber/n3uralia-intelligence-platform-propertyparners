'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import PrintReportButton from '@/components/reports/print-report-button'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type CeoReportData = {
  period: string
  generatedAt: string
  company: {
    sales: number | null
    salesUf: number | null
    cumulativeSales: number | null
    cumulativeSalesUf: number | null
    stock: number | null
    followUpScore: number | null
    conversionScore: number | null
    targets: {
      salesMonthly: number | null
      cumulativeTarget: number | null
    }
    yoy: {
      sales: number | null
      salesUf: number | null
      cumulative: number | null
    }
  }
  market: {
    zones: string[]
    dataSources: string[]
    avgCycleDays: number
    competitiveAdvantage: string
    marketTrends: Array<{
      title: string
      signal: string
      confidence: 'high' | 'medium' | 'low'
      action?: string
    }>
  }
  valuation: {
    methodology: string
    propertyTypesAnalyzed: string[]
    valuationModels: Array<{
      type: string
      count: number
      status: 'approved' | 'draft' | 'pending'
    }>
  }
  indicators: {
    compliance: number | null
    productivity: number | null
    marketSaturation: string
    conversionTrend: string
    leadQuality: string
  }
  risks: Array<{
    type: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    mitigation: string
  }>
  opportunities: Array<{
    area: string
    potential: string
    action: string
    priority: 'high' | 'medium' | 'low'
  }>
}

const fmt = (value: number | null, unit = 'UF'): string => {
  if (value === null) return 'n/d'
  if (unit === 'UF') return `${value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
  if (unit === '%') return `${value.toFixed(1)}%`
  return value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

const pct = (value: number | null): string => (value === null ? 'n/d' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`)

export function CeoEnhancedReport() {
  const [data, setData] = useState<CeoReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/management/ceo-enhanced-report', {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          throw new Error('No fue posible generar el reporte mejorado')
        }

        const result = await response.json()
        setData(result)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Error generando reporte')
      }
    }

    void fetchData()
  }, [])

  const reportId = `CEO-${(data?.generatedAt ?? new Date().toISOString()).slice(0, 10).replaceAll('-', '')}`

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-[#d7332b] text-[#ff766f]'
      case 'high':
        return 'border-[#f97316] text-[#fed7aa]'
      case 'medium':
        return 'border-[#a77a22] text-[#fef08a]'
      case 'low':
        return 'border-[#2f8f4e] text-[#86efac]'
      default:
        return 'border-[var(--n3-line)]'
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-[#2563eb]'
      case 'medium':
        return 'border-l-4 border-l-[#f59e0b]'
      case 'low':
        return 'border-l-4 border-l-[#6b7280]'
      default:
        return 'border-l-4 border-l-[var(--n3-line)]'
    }
  }

  return (
    <IntelligencePage>
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/ceo" className="border border-[var(--n3-line)] px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2">
          Volver al CEO
        </Link>
        <PrintReportButton />
      </div>

      <IntelligenceHeader
        eyebrow="Reporte ejecutivo CEO · Canónica + Mercado + Indicadores"
        title="Property Partners · Análisis integral con inteligencia de mercado"
        description="Resultados operacionales, desempeño vs indicadores, inteligencia de mercado, análisis de valuación, riesgos y oportunidades estratégicas."
        meta={<div className="text-xs text-[var(--n3-text-muted)]">ID {reportId}</div>}
      />

      {error ? (
        <div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]">
          {error}
        </div>
      ) : null}

      {!error && !data ? (
        <div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">
          Generando reporte integral…
        </div>
      ) : null}

      {!error && data ? (
        <>
          {/* SECTION 01: RESULTADO Y DESEMPEÑO */}
          <section>
            <SectionHeading eyebrow="01 · Resultado" title="Desempeño vs indicadores 2026" />
            <MetricGrid columns={4}>
              <MetricCard label="Cierres junio" value={fmt(data.company.sales)} detail={`Target: ${fmt(data.company.targets.salesMonthly)} · YoY ${pct(data.company.yoy.sales)}`} />
              <MetricCard label="UF junio" value={fmt(data.company.salesUf)} detail={`YoY ${pct(data.company.yoy.salesUf)}`} />
              <MetricCard label="Cierres acumulados" value={fmt(data.company.cumulativeSales)} detail={`Target: ${fmt(data.company.targets.cumulativeTarget)} · YoY ${pct(data.company.yoy.cumulative)}`} />
              <MetricCard label="Compliance" value={fmt(data.indicators.compliance, '%')} detail={data.indicators.compliance ? (data.indicators.compliance >= 100 ? 'Sobre meta' : 'Bajo meta') : 'n/d'} />
            </MetricGrid>
          </section>

          {/* SECTION 02: INDICADORES OPERACIONALES */}
          <section>
            <SectionHeading eyebrow="02 · Indicadores" title="Desempeño operacional y gestión" />
            <MetricGrid columns={4}>
              <MetricCard label="Productividad" value={fmt(data.indicators.productivity)} detail="Cierres por ejecutiva/mes" />
              <MetricCard label="Conversión" value={fmt(data.company.conversionScore)} detail={data.indicators.conversionTrend} />
              <MetricCard label="Seguimiento" value={fmt(data.company.followUpScore)} detail="Score de calidad" />
              <MetricCard label="Cartera" value={fmt(data.company.stock)} detail={data.indicators.marketSaturation} />
            </MetricGrid>
          </section>

          {/* SECTION 03: INTELIGENCIA DE MERCADO */}
          <section>
            <SectionHeading eyebrow="03 · Mercado" title="Señales y tendencias de mercado" />
            <div className="grid gap-4 lg:grid-cols-2">
              {data.market.marketTrends.map((trend, idx) => (
                <article key={idx} className="border border-[var(--n3-line)] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--n3-text-primary)]">{trend.title}</h4>
                      <p className="mt-2 text-sm text-[var(--n3-text-secondary)]">{trend.signal}</p>
                    </div>
                    <span className={`ml-3 whitespace-nowrap text-xs px-2 py-1 rounded ${trend.confidence === 'high' ? 'bg-[#2f8f4e] text-white' : trend.confidence === 'medium' ? 'bg-[#f59e0b] text-white' : 'bg-[#6b7280] text-white'}`}>
                      {trend.confidence === 'high' ? 'Alta' : trend.confidence === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  {trend.action && (
                    <div className="mt-3 border-t border-[var(--n3-line)] pt-3">
                      <p className="text-xs font-semibold text-[var(--n3-text-muted)]">Acción recomendada:</p>
                      <p className="mt-1 text-sm text-[var(--n3-text-secondary)]">{trend.action}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <article className="border border-[var(--n3-line)] p-4">
                <p className="text-xs font-semibold text-[var(--n3-text-muted)]">Zonas de operación</p>
                <p className="mt-2 text-sm">{data.market.zones.join(', ')}</p>
              </article>
              <article className="border border-[var(--n3-line)] p-4">
                <p className="text-xs font-semibold text-[var(--n3-text-muted)]">Diferenciador competitivo</p>
                <p className="mt-2 text-sm">{data.market.competitiveAdvantage}</p>
              </article>
            </div>
          </section>

          {/* SECTION 04: ANÁLISIS DE VALUACIÓN */}
          <section>
            <SectionHeading eyebrow="04 · Valuación" title="Modelos de valuación y metodología" />
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="border border-[var(--n3-line)] p-4">
                <h4 className="font-semibold text-[var(--n3-text-primary)]">Metodología</h4>
                <p className="mt-2 text-sm text-[var(--n3-text-secondary)]">{data.valuation.methodology}</p>
                <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Tipos de propiedad analizados:</p>
                <p className="mt-1 text-sm">{data.valuation.propertyTypesAnalyzed.join(', ')}</p>
              </article>
              <article className="border border-[var(--n3-line)] p-4">
                <h4 className="font-semibold text-[var(--n3-text-primary)] mb-3">Estado de modelos</h4>
                <div className="space-y-2">
                  {data.valuation.valuationModels.map((model, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{model.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--n3-text-muted)]">{model.count} modelos</span>
                        <span className={`px-2 py-1 text-xs rounded ${model.status === 'approved' ? 'bg-[#2f8f4e] text-white' : model.status === 'draft' ? 'bg-[#f59e0b] text-white' : 'bg-[#6b7280] text-white'}`}>
                          {model.status === 'approved' ? 'Aprobado' : model.status === 'draft' ? 'Borrador' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          {/* SECTION 05: RIESGOS */}
          <section>
            <SectionHeading eyebrow="05 · Riesgos" title="Riesgos identificados y plan de mitigación" />
            <div className="space-y-3">
              {data.risks.map((risk, idx) => (
                <article key={idx} className={`border p-4 ${severityColor(risk.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{risk.type}</h4>
                      <p className="mt-2 text-sm">{risk.description}</p>
                    </div>
                    <span className="ml-3 whitespace-nowrap text-xs px-2 py-1 rounded bg-opacity-20">
                      {risk.severity === 'critical' ? 'Crítico' : risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Medio' : 'Bajo'}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-current border-opacity-30 pt-3">
                    <p className="text-xs font-semibold">Plan de mitigación:</p>
                    <p className="mt-1 text-sm">{risk.mitigation}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* SECTION 06: OPORTUNIDADES */}
          <section>
            <SectionHeading eyebrow="06 · Oportunidades" title="Iniciativas de crecimiento y mejora" />
            <div className="space-y-3">
              {data.opportunities.map((opp, idx) => (
                <article key={idx} className={`border p-4 ${priorityColor(opp.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--n3-text-primary)]">{opp.area}</h4>
                      <p className="mt-1 text-sm text-[var(--n3-text-secondary)]">{opp.potential}</p>
                    </div>
                    <span className={`ml-3 whitespace-nowrap text-xs px-2 py-1 rounded ${opp.priority === 'high' ? 'bg-[#2563eb] text-white' : opp.priority === 'medium' ? 'bg-[#f59e0b] text-white' : 'bg-[#6b7280] text-white'}`}>
                      {opp.priority === 'high' ? 'Alta' : opp.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-[var(--n3-line)] pt-3">
                    <p className="text-xs font-semibold text-[var(--n3-text-muted)]">Acción:</p>
                    <p className="mt-1 text-sm text-[var(--n3-text-secondary)]">{opp.action}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* METHODOLOGY NOTE */}
          <MethodologyNote>
            Reporte {reportId}. Período {data.period}. Generado {new Date(data.generatedAt).toLocaleString('es-CL')}. Inteligencia integral combinando datos canónicos (CRM, targets, cartera), 
            inteligencia de mercado (zonas, tendencias, competencia), análisis de valuación (metodología, modelos), e indicadores de performance (compliance, productividad, conversión). 
            Incluye evaluación de riesgos y oportunidades para apoyo a decisiones estratégicas del CEO.
          </MethodologyNote>
        </>
      ) : null}
    </IntelligencePage>
  )
}
