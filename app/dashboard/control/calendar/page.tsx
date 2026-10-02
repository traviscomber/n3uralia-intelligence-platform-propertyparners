import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { SaleHandoverCalendar } from '@/components/management/sale-handover-calendar'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

export default async function ManagementSaleCalendarPage(){
  await requireAnyPageCapability(['management.global.read','management.office.read'])

  return <WorkspaceShell contentClassName="max-w-[1600px]">
    <WorkspaceHeader
      eyebrow="Gestión"
      title="Calendario venta → entrega"
      meta="Seguimiento operacional desde el cierre comercial hasta la entrega de la propiedad"
      actions={[{label:'Volver a Gestión',href:'/dashboard/control/operations',icon:<ArrowLeft size={14}/>}]}
    />
    <SaleHandoverCalendar />
    <div className="mt-8 border-t border-[var(--n3-line)] pt-4 text-xs leading-5 text-[var(--n3-text-muted)]">
      La plantilla usa un horizonte inicial de cuatro meses. Las fechas contractuales reales y responsables deben prevalecer sobre la plantilla cuando estén disponibles. Las tareas se registran en el mismo sistema de Gestión y mantienen historial operativo.
      <Link href="/dashboard/control/operations" className="ml-2 text-[var(--n3-teal-soft)]">Abrir Gestión</Link>
    </div>
  </WorkspaceShell>
}
