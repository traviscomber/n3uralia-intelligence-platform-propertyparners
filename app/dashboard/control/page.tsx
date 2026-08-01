import { redirect } from 'next/navigation'
import { getUserScope } from '@/lib/user-scope'

/**
 * Role-aware entry point for Control de gestión.
 *
 * The previous implementation consumed a legacy response contract from
 * /api/management/summary (snake_case entities, profile and period fields).
 * The current API exposes the canonical role-scoped contract used by the
 * dedicated CEO, director and partner workspaces. Redirecting here avoids a
 * second incompatible dashboard and keeps one source of truth per role.
 */
export default async function ControlPage() {
  const scope = await getUserScope()

  if (scope.role === 'ceo' || scope.role === 'admin') {
    redirect('/dashboard/ceo')
  }

  if (scope.role === 'director' || scope.role === 'subdirector') {
    redirect('/dashboard/director')
  }

  redirect('/dashboard/partner')
}
