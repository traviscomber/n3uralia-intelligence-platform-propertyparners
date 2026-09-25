import Link from 'next/link'
import { DirectorDashboardV3 } from '@/components/management/director-dashboard-v3'
import { DirectorOperationalWorkspace } from '@/components/management/director-operational-workspace'
import { DirectorDecisionTrace } from '@/components/management/director-decision-trace'
import { DataLayerLegend } from '@/components/management/data-layer-legend'
import { getUserScope } from '@/lib/user-scope'

const officeSlug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default async function DirectorDashboard() {
  const scope = await getUserScope()
  const officeHref = scope.team ? `/dashboard/control/offices/${officeSlug(scope.team)}` : null

  return <>
    <DirectorDashboardV3 />

    <nav aria-label="Acciones de dirección" className="print-hidden mx-4 mt-5 flex flex-wrap gap-2 border-t border-[var(--n3-line)] pt-4 lg:mx-8">
      {officeHref ? <Link href={officeHref} className="border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Office 360</Link> : null}
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
