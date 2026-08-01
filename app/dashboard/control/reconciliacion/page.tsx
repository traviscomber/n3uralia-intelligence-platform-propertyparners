import { redirect } from 'next/navigation'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'
import { MetricReconciliationWorkspace } from '@/components/management/metric-reconciliation-workspace'
import { getUserScope } from '@/lib/user-scope'

export default async function ManagementMetricReconciliationPage() {
  const scope = await getUserScope()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(scope.role)) {
    redirect('/dashboard/partner')
  }

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo III · Integridad de datos"
        title="Conciliación y publicación de métricas"
        description="Compara evidencia publicada con el cálculo canónico. Sólo una conciliación dentro de tolerancia y aprobada por CEO alimenta los dashboards persistidos."
        actions={[
          { label: 'Administración', href: '/dashboard/control/admin' },
          { label: 'Volver a control', href: '/dashboard/control', primary: true },
        ]}
      />
      <MetricReconciliationWorkspace />
    </IntelligencePage>
  )
}
