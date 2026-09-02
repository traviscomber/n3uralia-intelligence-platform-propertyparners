import { redirect } from 'next/navigation'
import { ReportDeliveryConsole } from '@/components/management/report-delivery-console'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'
import { getUserScope } from '@/lib/user-scope'

export default async function ReportOperationsPage() {
  const scope = await getUserScope()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(scope.role)) redirect('/dashboard/reportes/autonomos')

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
    <ReportDeliveryConsole canOperate={scope.role === 'admin' || scope.role === 'ceo'} />
  </IntelligencePage>
}