import Link from 'next/link'
import { DirectorDashboardV3 } from '@/components/management/director-dashboard-v3'
import { DirectorOperationalWorkspace } from '@/components/management/director-operational-workspace'
import { DirectorDecisionTrace } from '@/components/management/director-decision-trace'
import { DataLayerLegend } from '@/components/management/data-layer-legend'

export default function DirectorDashboard() {
  return <>
    <DirectorDashboardV3 />

    <nav aria-label="Acciones de dirección" className="print-hidden mx-4 mt-5 flex flex-wrap gap-2 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      <Link href="/dashboard/director/tareas" className="border border-[var(--n3-line)] px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Gestionar tareas</Link>
      <Link href="/dashboard/director/reporte" className="border border-[var(--n3-line)] px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Abrir informe</Link>
    </nav>

    <details className="mx-4 mt-6 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver operación y evidencia</summary>
      <div className="mt-5">
        <DirectorOperationalWorkspace />
        <DirectorDecisionTrace />
        <DataLayerLegend showProvisionalRules />
      </div>
    </details>
  </>
}
