import { redirect } from 'next/navigation'
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
      title="Generar y enviar"
      description="Genera informes desde snapshots persistidos, revisa el PDF y procesa entregas autorizadas. La recurrencia permanece bloqueada hasta contar con reglas, calendario y destinatarios aprobados."
      actions={[
        { label: 'Ver informes', href: '/dashboard/reportes/canonicos', primary: true },
        { label: 'Revisar programaciones', href: '/dashboard/control/admin' },
      ]}
    />
    {canOperate ? <CanonicalLatestReportGenerator /> : null}
    <ReportDeliveryConsole canOperate={canOperate} />
  </IntelligencePage>
}