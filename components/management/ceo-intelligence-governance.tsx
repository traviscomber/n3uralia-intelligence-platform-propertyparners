import 'server-only'

import { AlertTriangle, Database, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MANAGEMENT_DECISION_POLICY } from '@/lib/management-decision-policy'

export async function CeoIntelligenceGovernance() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('management_approved_metric_values')
    .select('*', { count: 'exact', head: true })

  const approvedMetricCount = error ? null : count ?? 0
  const hasApprovedLiveMetrics = approvedMetricCount != null && approvedMetricCount > 0

  return (
    <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5" aria-labelledby="ceo-intelligence-governance-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
            <ShieldCheck size={14} />
            Gobernanza de inteligencia
          </div>
          <h2 id="ceo-intelligence-governance-title" className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">
            Reglas operativas separadas de la metodología canónica
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
            Los umbrales de priorización ejecutiva vigentes pertenecen a N3uralia y permanecen provisionales hasta que el Cliente apruebe su diccionario KPI y reglas de alertas. No reemplazan fórmulas ni definiciones canónicas.
          </p>
        </div>

        <div className="grid min-w-[280px] gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="bg-[var(--n3-black)] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Política</p>
            <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">{MANAGEMENT_DECISION_POLICY.version}</p>
            <p className="mt-1 text-xs text-[#f6c453]">N3uralia · provisional</p>
          </div>
          <div className="bg-[var(--n3-black)] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Métricas vivas aprobadas</p>
            <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">{approvedMetricCount == null ? 'No verificable' : approvedMetricCount}</p>
            <p className={`mt-1 text-xs ${hasApprovedLiveMetrics ? 'text-[#65d3a5]' : 'text-[#f6c453]'}`}>
              {hasApprovedLiveMetrics ? 'Capa aprobada disponible' : 'Pendiente aprobación/carga'}
            </p>
          </div>
        </div>
      </div>

      {!hasApprovedLiveMetrics ? (
        <div className="mt-4 flex items-start gap-3 border-t border-[var(--n3-line)] pt-4 text-sm text-[var(--n3-text-muted)]">
          {error ? <AlertTriangle className="mt-0.5 shrink-0 text-[#ff766f]" size={16} /> : <Database className="mt-0.5 shrink-0 text-[#f6c453]" size={16} />}
          <p>
            {error
              ? 'No fue posible verificar la capa de métricas aprobadas. Las decisiones deben tratarse como apoyo y no como evidencia aprobada.'
              : 'Producción todavía no contiene métricas vivas aprobadas. El dashboard conserva evidencia documental/canónica disponible y debe declarar esta limitación hasta que el Cliente complete la aprobación correspondiente.'}
          </p>
        </div>
      ) : null}
    </section>
  )
}
