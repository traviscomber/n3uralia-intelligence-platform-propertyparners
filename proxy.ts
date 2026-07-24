import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'

const roleRoutes = {
  board_director: '/dashboard/board',
  ceo: '/dashboard/ceo',
  account_director: '/dashboard/accounts',
  executive: '/dashboard/executive',
}

export async function proxy(request: NextRequest) {
  // Handle role-based dashboard routing
  if (request.nextUrl.pathname === '/dashboard') {
    const role = request.cookies.get('n3uralia_role')?.value as keyof typeof roleRoutes | undefined
    if (role && roleRoutes[role]) {
      return NextResponse.redirect(new URL(roleRoutes[role], request.url))
    }
  }

  // Update session from Supabase
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
