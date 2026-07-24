import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const roleRoutes = {
  board_director: '/dashboard/board',
  ceo: '/dashboard/ceo',
  account_director: '/dashboard/accounts',
  executive: '/dashboard/executive',
}

export function middleware(request: NextRequest) {
  const role = request.cookies.get('n3uralia_role')?.value as keyof typeof roleRoutes | undefined

  if (request.nextUrl.pathname === '/dashboard' && role) {
    return NextResponse.redirect(new URL(roleRoutes[role], request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard'],
}
