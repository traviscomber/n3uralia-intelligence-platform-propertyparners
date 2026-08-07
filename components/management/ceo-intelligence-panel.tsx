import 'server-only'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, BrainCircuit, ShieldCheck } from 'lucide-react'
import { getN3uraliaIntelligence } from '@/lib/n3uralia-intelligence-gateway'
import { evaluateManagementDecisionPolicy } from '@/lib/management-decision-evaluator'

const TENANT_ID = 'property-partners'

export async function CeoIntelligencePanel() {
  const [result, governed] = await Promise.all([
    getN3uraliaIntelligence({
      tenantId: TENANT_ID,
      audience: 'ceo',
      domains: ['executive', 'crm', 'market', 'valuation'],
      purpose: 'decision-support',
    }),
    Promise.resolve(evaluateManagementDecisionPolicy()),
  ])

  const signals = result.remote?.signals ?? result.local.signals
  const risks = result.remote?.risks ?? result.local.risks
  const actions = result.remote?.actions ?? result.local.actions
  const criticalRisk = risks.find((item) => item.severity === 'critical') ?? risks[0] ?? null
  const topActions = actions.slice(0, 3)
  const topGoverned = governed.signals.slice(0, 2)

  return (
    <section className="space-y-4" aria-labelledby="n3uralia-intelligence-title">
      <div className="flex flex-col gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
            <BrainCircuit size={15} />
            Inteligencia N3uralia · {result.mode}
          </div>
          <h2 id="n3uralia-intelligence-title" className="mt-2 text-xl font-semibold">
            Prioridades ejecutivas derivadas
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
            Señales, riesgos y acciones generadas desde evidencia autorizada. No se exponen prompts, reglas internas ni trazas del motor.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-teal)]">
          <ShieldCheck size={15} />
          {signals.length} señales · {risks.length} riesgos · {actions.length} acciones
        </div>
      </div>

      <div className="border border-[#a77a22] bg-[#0c1111] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#f6c453]">
              Política de decisión · {governed.policyVersion}
            </p>
            <p className="mt-1 text-sm text-[var(--n3-text-light)]">
              Reglas N3uralia provisionales mientras el diccionario KPI del cliente no esté aprobado.
            </p>
          </div>
          <p className="text-xs text-[var(--n3-text-muted)]">
            {governed.signals.length} señales activas · {governed.unavailableMetrics.length} métricas no evaluables
          </p>
        </div>
        {topGoverned.length ? (
          <div className="mt-3 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
            {topGoverned.map((item) => (
              <div key={item.ruleId} className="bg-[#0c1111] p-3">
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.evidence}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {result.remoteError ? (
        <div role="status" className="border border-[#a77a22] bg-[#0c1111] p-4 text-sm text-[#f6c453]">
          Runtime privado no disponible en modo shadow. La vista mantiene el resultado local autorizado.
        </div>
      ) : null}

      {result.parity ? (
        <div
          role="status"
          className={`border bg-[#0c1111] p-4 text-sm ${result.parity.exactIdParity ? 'border-[#2f8f4e] text-[#65c780]' : 'border-[#a77a22] text-[#f6c453]'}`}
        >
          {result.parity.exactIdParity
            ? 'Validación shadow: paridad exacta de señales, riesgos y acciones.'
            : `Validación shadow pendiente: diferencias señales ${result.parity.signalCountDelta}, riesgos ${result.parity.riskCountDelta}, acciones ${result.parity.actionCountDelta}.`}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <article className={`border bg-[#0c1111] p-5 ${criticalRisk ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#ff766f]">
            <AlertTriangle size={15} />
            Riesgo prioritario
          </div>
          <p className="mt-4 text-lg font-semibold">{criticalRisk?.title ?? 'Sin riesgo prioritario disponible'}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
            {criticalRisk?.detail ?? 'El motor no devolvió riesgos para este alcance.'}
          </p>
        </article>

        <div className="space-y-3">
          {topActions.length ? topActions.map((item) => (
            <article key={item.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
                    {item.priority} · {item.domain}
                  </p>
                  <h3 className="mt-1 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">{item.rationale}</p>
                  <p className="mt-2 text-sm">{item.action}</p>
                </div>
                {'href' in item && typeof item.href === 'string' ? (
                  <Link href={item.href} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-[#ff766f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                    Abrir
                    <ArrowRight size={13} />
                  </Link>
                ) : null}
              </div>
            </article>
          )) : (
            <div className="border border-dashed border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">
              No existen acciones ejecutivas disponibles para este alcance.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
