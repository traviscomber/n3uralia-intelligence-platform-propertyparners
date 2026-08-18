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
      description="Genera el informe, revisa el PDF y envíalo."
      actions={[
        { label: 'Ver informes', href: '/dashboard/reportes/canonicos', primary: true },
        { label: 'Programaciones', href: '/dashboard/control/admin' },
      ]}
    />
    <ReportDeliveryConsole canOperate={scope.role === 'admin' || scope.role === 'ceo'} />
  </IntelligencePage>
}
