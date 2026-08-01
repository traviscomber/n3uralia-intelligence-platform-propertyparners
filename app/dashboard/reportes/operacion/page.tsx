import { redirect } from 'next/navigation'
import { ReportDeliveryConsole } from '@/components/management/report-delivery-console'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'
import { getUserScope } from '@/lib/user-scope'

export default async function ReportOperationsPage() {
  const scope = await getUserScope()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(scope.role)) redirect('/dashboard/reportes/autonomos')

  return <IntelligencePage>
    <IntelligenceHeader
      eyebrow="Report Operations"
      title="Centro de generación y entrega"
      description="Control de reportes generados, PDFs, destinatarios, reintentos y estado del proveedor de correo."
      actions={[
        { label: 'Reportes ejecutivos', href: '/dashboard/reportes/autonomos', primary: true },
        { label: 'Programaciones', href: '/dashboard/control/admin' },
      ]}
      meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Alcance: {scope.role}</div>}
    />
    <ReportDeliveryConsole canOperate={scope.role === 'admin' || scope.role === 'ceo'} />
  </IntelligencePage>
}
