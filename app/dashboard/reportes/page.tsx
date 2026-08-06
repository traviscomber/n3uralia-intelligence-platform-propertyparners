import { redirect } from 'next/navigation'
import { getUserScope } from '@/lib/user-scope'

export default async function ReportsPage() {
  const scope = await getUserScope()
  if (['admin', 'ceo'].includes(scope.role)) {
    redirect('/dashboard/reportes/crear')
  }
  if (scope.role === 'director') {
    redirect('/dashboard/reportes/operacion')
  }
  redirect('/dashboard/reportes/autonomos')
}
