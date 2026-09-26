import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessDashboardPath } from '@/lib/dashboard-access'

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.includes('auth-token')) continue
    response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
  }
  return response
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public pages and the access-error screen expose no authenticated
  // business data and do not need a Supabase Auth round trip. Session refresh
  // occurs on the next protected request.
  const isLandingPage = pathname === '/'
  const isPublicPage = isLandingPage || pathname.startsWith('/about') || pathname.startsWith('/contact')
  if (isPublicPage || pathname === '/auth/error') {
    return NextResponse.next({ request })
  }

  // These two endpoints are intentionally public and expose no authenticated
  // business records. /api/release returns deployment identity for CI, while
  // the valuation endpoint returns aggregate market statistics only.
  if (
    pathname === '/api/release'
    || pathname === '/api/public/valuation-estimate'
    || pathname === '/api/internal/portal-collector-smoke'
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Skip auth enforcement in development for faster iteration.
  if (process.env.NODE_ENV !== 'development') {
    const isApiPath = pathname.startsWith('/api/')
    const isCronPath = pathname.startsWith('/api/cron/')

    // Cron handlers use their own CRON_SECRET authorization and service-role client.
    // They must reach the route without requiring a browser Supabase session.
    if (isCronPath) return supabaseResponse

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsError ? null : String(claimsData?.claims?.sub || '') || null
    if (claimsError) {
      // Invalid/expired auth state is unauthenticated. Clear only Supabase auth
      // cookies so the next login starts from a clean session.
      supabaseResponse = clearSupabaseAuthCookies(request, supabaseResponse)
    }

    const isAuthPath = pathname.startsWith('/auth')
    const isLegacyMarketingPath = pathname === '/es' || pathname.startsWith('/es/')

    // API consumers must receive a machine-readable authentication error instead
    // of an HTML login page with a misleading 200 response.
    if (!userId && isApiPath) {
      const response = NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
      return clearSupabaseAuthCookies(request, response)
    }

    // This deployment is the private Property Partners portal. Keep legacy
    // N3uralia marketing pages out of the production navigation for every user.
    if (isLegacyMarketingPath) {
      const url = request.nextUrl.clone()
      url.pathname = userId ? '/dashboard' : '/auth/login'
      const response = NextResponse.redirect(url)
      return userId ? response : clearSupabaseAuthCookies(request, response)
    }

    // Allow public access to landing page and public routes.
    if (!userId && !isAuthPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return clearSupabaseAuthCookies(request, NextResponse.redirect(url))
    }

    if (userId && isAuthPath && !pathname.startsWith('/auth/callback') && pathname !== '/auth/error' && pathname !== '/auth/mfa') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (userId && pathname.startsWith('/dashboard')) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      // Unknown or missing roles are rejected by canAccessDashboardPath.
      const role = profile?.role || 'unauthorized'
      if (!canAccessDashboardPath(role, pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/error'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
