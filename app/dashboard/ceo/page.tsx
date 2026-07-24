'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, Building2, FileText, ShieldCheck, Target, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { buildOperationalSeries, getDataQuality, getOperationalSummary, getYtdSummary, CRM_INTELLIGENCE } from '@/lib/crm-snapshot'
import { getBranchSalesYtdPerformance } from '@/lib/targets-2026'
import { buildExecutiveCases } from '@/lib/executive-cases'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  RankedRow,
  SectionHeading,
} from '@/components/intelligence/design-system'

function compactUf(value: number) {
  if (value <= 0) return 'n/d'
  return `${(value / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}K UF`
}

function formatCaseDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function CeoDashboard() {
  const operational = getOperationalSummary()
  const chartData = buildOperationalSeries(6).map(({ mes, ventas, captaciones, leads }) => ({ mes, ventas, captaciones, leads }))
  const branches = getBranchSalesYtdPerformance('2026-06')
  const ytd = getYtdSummary()
  const dataQuality = getDataQuality()
  const januaryStock = operational.stock - ytd.stockChange
  const stockRetention = januaryStock > 0 ? Number(((operational.stock / januaryStock) * 100).toFixed(1)) : null
  const attributedBranchSales = branches.reduce((sum, branch) => sum + branch.actualSales, 0)
  const attributedBranchUf = branches.reduce((sum, branch) => sum + branch.actualUf, 0)
  const maxBranchSales = Math.max(...branches.map((branch) => branch.actualSales), 1)
  const executiveCases = buildExecutiveCases('ceo')
  const executiveContext = buildN3uraliaIntelligenceContext('ceo')
  const criticalIssues = CRM_INTELLIGENCE.quality.issues.filter((issue) => issue.severity === 'critical')
  const warningIssues = CRM_INTELLIGENCE.quality.issues.filter((issue) => issue.severity === 'warning')

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Executive Intelligence Hub · CEO"
        title="Centro de Mando Ejecutivo"
        description="Una vista única para entender desempeño comercial, cumplimiento, calidad de datos, riesgos y acciones prioritarias. Cada indicador conserva acceso directo al módulo que explica su origen."
        actions={[
          { label: 'Abrir Reporte de Directorio', href: '/dashboard/reportes/directorio', primary: true },
          { label: 'Ver Control de Gestión', href: '/dashboard/control' },
        ]}
        meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Corte auditado enero–junio 2026 · Motor de inteligencia N3uralia</div>}
      />

      <section>
        <SectionHeading
          eyebrow="01 · Executive Cases"
          title="Casos ejecutivos prioritarios"
          description="Casos ordenados por prioridad y confianza, con recomendación, preguntas abiertas, evidencia, estado de validación e historial trazable."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {executiveCases.map((executiveCase, index) => {
            const sourceAction = executiveContext.actions.find((item) => item.id === executiveCase.decisionId)
            const evidenceIds = new Set(sourceAction?.evidenceIds ?? [])
            const relatedEvidence = executiveContext.evidence.filter((item) => evidenceIds.has(item.id))
            const relatedRisks = executiveContext.risks.filter((risk) =>
              risk.domain === sourceAction?.domain
              || risk.evidenceIds.some((evidenceId) => evidenceIds.has(evidenceId)),
            )
            const changeCondition = relatedEvidence.length === 0
              ? 'La recomendación debe revisarse cuando exista evidencia externa o interna adicional para este dominio.'
              : 'La recomendación puede cambiar si se actualizan los datos fuente, el período analizado o la atribución de los registros.'
            const validationLabel = executiveCase.validationStatus === 'validated'
              ? 'Validada'
              : executiveCase.validationStatus === 'rejected'
                ? 'Rechazada'
                : 'Pendiente de validación humana'
            const validationClass = executiveCase.validationStatus === 'validated'
              ? 'border-emerald-500/50 text-emerald-300'
              : executiveCase.validationStatus === 'rejected'
                ? 'border-red-500/50 text-red-300'
                : 'border-amber-500/50 text-amber-300'

            return (
              <article
                key={executiveCase.id}
                className={`flex min-h-[300px] flex-col border bg-[#0c1111] p-5 ${executiveCase.priority === 'high' ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span>
                    <Target size={18} className={executiveCase.priority === 'high' ? 'text-[#ff766f]' : 'text-[var(--n3-teal-soft)]'} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
                      {executiveCase.priority === 'high' ? 'Prioridad alta' : executiveCase.priority === 'medium' ? 'Prioridad media' : 'Seguimiento'}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Confianza {executiveCase.confidence}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <div className={`inline-flex w-fit items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${validationClass}`}>
                    {validationLabel}
                  </div>
                  <div className="inline-flex w-fit items-center border border-[var(--n3-line)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
                    Caso {executiveCase.status}
                  </div>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-[var(--n3-text-light)]">{executiveCase.subject}</h3>
                <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{executiveCase.reason}</p>

                <div className="mt-5 border-t border-[var(--n3-line)] pt-4">
                  <div className="flex gap-2 text-sm font-semibold leading-5 text-[var(--n3-text-light)]">
                    <ArrowRight size={16} className="mt-0.5 shrink-0 text-[#ff766f]" />
                    <span>{executiveCase.recommendation}</span>
                  </div>
                </div>

                <details className="mt-5 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
                  <summary className="cursor-pointer font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-light)]">Ver trazabilidad</summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="font-semibold text-[var(--n3-text-light)]">Historial del caso</p>
                      <ol className="mt-3 space-y-3 border-l border-[var(--n3-line)] pl-4">
                        {executiveCase.history.map((event) => (
                          <li key={event.id} className="relative">
                            <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-[var(--n3-teal-soft)]" />
                            <p className="font-semibold text-[var(--n3-text-light)]">{event.note}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.1em]">{formatCaseDate(event.occurredAt)} · {event.actor === 'human' ? 'Validación humana' : 'Motor N3uralia'}</p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--n3-text-light)]">Preguntas abiertas</p>
                      <ul className="mt-2 space-y-2">
                        {executiveCase.openQuestions.map((question) => (
                          <li key={question.id} className="border-l border-amber-500/60 pl-3">
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-[var(--n3-text-light)]">{question.question}</span>
                              <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] ${question.status === 'answered' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {question.status === 'answered' ? 'Respondida' : 'Abierta'}
                              </span>
                            </div>
                            <span className="mt-1 block text-[10px] leading-4">{question.rationale}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--n3-text-light)]">Evidencia utilizada</p>
                      {relatedEvidence.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {relatedEvidence.map((evidence) => (
                            <li key={evidence.id} className="border-l border-[var(--n3-teal-soft)] pl-3">
                              <span className="font-semibold text-[var(--n3-text-light)]">{evidence.label}:</span> {evidence.value ?? 'n/d'}
                              <span className="block text-[10px]">{evidence.source}{evidence.period ? ` · ${evidence.period}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-2">No hay evidencia directa vinculada; el caso se apoya en una señal de contexto que requiere validación adicional.</p>}
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--n3-text-light)]">Riesgos asociados</p>
                      {relatedRisks.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {relatedRisks.slice(0, 3).map((risk) => (
                            <li key={risk.id}><span className="font-semibold text-[#ff766f]">{risk.title}:</span> {risk.detail}</li>
                          ))}
                        </ul>
                      ) : <p className="mt-2">No se identificaron riesgos específicos adicionales para este caso.</p>}
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--n3-text-light)]">Qué podría cambiar esta recomendación</p>
                      <p className="mt-2">{changeCondition}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--n3-text-light)]">Resultado</p>
                      <p className="mt-2">Pendiente de medición.</p>
                    </div>
                  </div>
                </details>

                <Link href={executiveCase.href} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#ff766f]">
                  Abrir evidencia y contexto <ArrowRight size={14} />
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Business Performance" title="Desempeño y velocidad comercial" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
          <IntelligencePanel eyebrow="Operational Trend" title="Últimos seis meses" description="Ventas, captaciones y leads provenientes de los cortes mensuales disponibles.">
            <div className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n3-line)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--n3-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--n3-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0c1111', border: '1px solid var(--n3-line)', borderRadius: 0, fontSize: 12 }} />
                  <Bar dataKey="ventas" fill="var(--n3-teal-soft)" name="Ventas" />
                  <Bar dataKey="captaciones" fill="var(--n3-text-muted)" name="Captaciones" />
                  <Bar dataKey="leads" fill="var(--n3-text-light)" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap justify-center gap-5 text-[11px] text-[var(--n3-text-muted)]">
                <span>Ventas</span><span>Captaciones</span><span>Leads</span>
              </div>
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Control Indicators" title="Señales de gestión" description="Lecturas independientes para evitar ocultar diferencias detrás de un único score." critical>
            <div className="grid grid-cols-2 gap-px bg-[var(--n3-line)] p-5">
              {[
                ['Cartera junio / enero', stockRetention === null ? 'n/d' : `${stockRetention}%`, 'Retención de stock disponible.'],
                ['Ventas atribuibles', `${attributedBranchSales}/${ytd.salesCount}`, 'Cierres con sucursal identificada.'],
                ['UF atribuibles', compactUf(attributedBranchUf), `Sobre ${compactUf(ytd.salesUf)} acumuladas.`],
                ['Cobertura vendedor', ytd.sellerAttribution.coverage === null ? 'n/d' : `${ytd.sellerAttribution.coverage}%`, `${ytd.sellerAttribution.missing} ventas sin vendedor.`],
              ].map(([label, value, note]) => (
                <div key={label} className="bg-[#080d0d] p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">{note}</p>
                </div>
              ))}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Branch Performance" title="Resultado por sucursal" description={`${attributedBranchSales} de ${ytd.salesCount} cierres cuentan con atribución a sucursal en el corte.`} />
        <IntelligencePanel eyebrow="Branch Ranking" title="Ventas y cumplimiento" description="Comparación contra metas acumuladas compatibles con el período disponible.">
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-2">
              {branches.map((branch, index) => <RankedRow key={branch.id} rank={index + 1} label={branch.branch} value={`${branch.actualSales} ventas`} share={(branch.actualSales / maxBranchSales) * 100} />)}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
                  <tr><th className="py-3">Sucursal</th><th className="text-right">Ventas</th><th className="text-right">UF</th><th className="text-right">Meta</th><th className="text-right">Cumplimiento</th></tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id} className="border-b border-[var(--n3-line)] text-[var(--n3-text-light)]">
                      <td className="py-3 font-semibold">{branch.branch}</td>
                      <td className="text-right">{branch.actualSales}</td>
                      <td className="text-right">{compactUf(branch.actualUf)}</td>
                      <td className="text-right">{branch.targetSales.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</td>
                      <td className="text-right font-semibold text-[#ff766f]">{branch.compliance}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </IntelligencePanel>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Intelligence Modules" title="Acceso a la evidencia" description="Cada módulo responde una pregunta ejecutiva distinta y mantiene su propia metodología." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['/dashboard/market', 'Inteligencia de Mercado', '¿Qué está ocurriendo en el mercado y qué tan confiables son las fuentes?', TrendingUp],
            ['/dashboard/valorizador', 'Inteligencia de Valorización', '¿Cómo se construye y aprueba una recomendación de valor?', Building2],
            ['/dashboard/datos-crm', 'CRM Intelligence', '¿Dónde están las oportunidades, riesgos y acciones comerciales?', BarChart3],
            ['/dashboard/reportes/autonomos', 'Reportes Ejecutivos', '¿Cómo se publica una lectura consistente para cada audiencia?', FileText],
          ].map(([href, title, detail, Icon]) => (
            <Link key={String(href)} href={String(href)} className="group border border-[var(--n3-line)] bg-[#0c1111] p-5 transition hover:border-[#d7332b]">
              <Icon size={20} className="text-[#ff766f]" />
              <h3 className="mt-4 text-lg font-semibold text-[var(--n3-text-light)]">{String(title)}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{String(detail)}</p>
              <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[var(--n3-text-light)]">Abrir módulo <ArrowRight size={14} className="transition group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="05 · Risk & Confidence" title="Riesgos visibles del sistema" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <IntelligencePanel eyebrow="Executive Risk" title="Incidencias críticas" description="Problemas que pueden afectar lectura, atribución o comparabilidad de los resultados." critical>
            <div className="space-y-3 p-5">
              {criticalIssues.length > 0 ? criticalIssues.map((issue) => (
                <div key={issue.code} className="flex gap-3 border border-[var(--n3-line)] bg-[#080d0d] p-4">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--destructive)]" />
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{issue.code}</p><h3 className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">{issue.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{issue.detail}</p></div>
                </div>
              )) : <p className="text-sm text-[var(--n3-text-muted)]">No hay incidencias críticas registradas en el corte.</p>}
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Confidence Context" title="Advertencias y cobertura" description={`${warningIssues.length} advertencias documentadas y ${dataQuality.sourceCoverage}% de cobertura de fuentes.`}>
            <div className="space-y-3 p-5">
              {warningIssues.slice(0, 4).map((issue) => (
                <div key={issue.code} className="flex gap-3 border-b border-[var(--n3-line)] pb-3">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-400" />
                  <div><p className="text-sm font-semibold text-[var(--n3-text-light)]">{issue.title}</p><p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{issue.detail}</p></div>
                </div>
              ))}
              <Link href="/dashboard/datos-crm" className="inline-flex items-center gap-2 pt-2 text-xs font-semibold text-[#ff766f]">Revisar control completo de datos <ArrowRight size={14} /></Link>
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Methodology" title="Regla ejecutiva" />
        <MethodologyNote>
          Esta vista reúne indicadores de módulos distintos, pero no los mezcla en un score único. Ventas, metas, stock, leads y calidad de fuentes conservan universos, períodos y reglas propias. Los casos ejecutivos deben resolver sus preguntas abiertas y abrir el módulo correspondiente cuando requieran detalle o validación.
        </MethodologyNote>
      </section>

      <footer className="flex items-center gap-2 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)]"><ShieldCheck size={15} /> Property Partners · Executive Intelligence Hub · Powered by N3uralia Intelligence</footer>
    </IntelligencePage>
  )
}
