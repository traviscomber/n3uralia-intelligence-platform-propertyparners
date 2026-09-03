import { redirect } from 'next/navigation'
import { CeoIntelligenceReportGenerator } from '@/components/management/ceo-intelligence-report-generator'
import { CanonicalLatestReportGenerator } from '@/components/management/canonical-latest-report-generator'
import { ReportDeliveryConsole } from '@/components/management/report-delivery-console'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'
import { getUserScope } from '@/lib/user-scope'

export default async function ReportOperationsPage() {
  const scope = await getUserScope()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(scope.role)) redirect('/dashboard/reportes/autonomos')
  const canOperate = scope.role === 'admin' || scope.role === 'ceo'

  return <IntelligencePage>
    <IntelligenceHeader
      eyebrow="Informes"
      title="Generar y revisar"
      description="CEO Intelligence es el informe mensual de negocio para Property Partners. El informe contractual permanece separado para seguimiento de entrega N3uralia. Ningún borrador se envía automáticamente."
      actions={[
        { label: 'Ver informes', href: '/dashboard/reportes/canonicos', primary: true },
        { label: 'Revisar programaciones', href: '/dashboard/control/admin' },
      ]}
    />
    {canOperate ? <CeoIntelligenceReportGenerator /> : null}
    {canOperate ? <CanonicalLatestReportGenerator /> : null}
    <ReportDeliveryConsole canOperate={canOperate} />
  </IntelligencePage>
}
