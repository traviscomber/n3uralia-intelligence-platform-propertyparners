import { redirect } from 'next/navigation'
import { getUserScope } from '@/lib/user-scope'

export default async function ControlPage() {
  const scope = await getUserScope()

  if (scope.role === 'ceo' || scope.role === 'admin') {
    redirect('/dashboard/control/operations')
  }

  if (scope.role === 'director' || scope.role === 'subdirector') {
    redirect('/dashboard/director')
  }

  redirect('/dashboard/partner')
}
