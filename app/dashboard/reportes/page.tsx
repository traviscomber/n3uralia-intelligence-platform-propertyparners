import { redirect } from 'next/navigation'
import { getUserScope } from '@/lib/user-scope'

export default async function ReportsPage() {
  const scope = await getUserScope()

  if (['admin', 'ceo'].includes(scope.role)) {
    redirect('/dashboard/reportes/canonicos')
  }

  if (['director', 'subdirector'].includes(scope.role)) {
    redirect('/dashboard/reportes/operacion')
  }

  redirect('/dashboard/reportes/autonomos')
}
