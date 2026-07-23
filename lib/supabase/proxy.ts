import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessDashboardPath } from '@/lib/dashboard-access'

export async function updateSession(request: NextRequest) {
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
    const pathname = request.nextUrl.pathname
    const isApiPath = pathname.startsWith('/api/')
    const isCronPath = pathname.startsWith('/api/cron/')

    // Cron handlers use their own CRON_SECRET authorization and service-role client.
    // They must reach the route without requiring a browser Supabase session.
    if (isCronPath) return supabaseResponse

    const { data: { user } } = await supabase.auth.getUser()
    const isAuthPath = pathname.startsWith('/auth')
    const isLandingPage = pathname === '/'
    const isLegacyMarketingPath = pathname === '/es' || pathname.startsWith('/es/')
    const isPublicPath = isLandingPage || pathname.startsWith('/about') || pathname.startsWith('/contact')

    // API consumers must receive a machine-readable authentication error instead
    // of an HTML login page with a misleading 200 response.
    if (!user && isApiPath) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // This deployment is the private Property Partners portal. Keep legacy
    // N3uralia marketing pages out of the production navigation for every user.
    if (isLegacyMarketingPath) {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/dashboard' : '/auth/login'
      return NextResponse.redirect(url)
    }

    // Allow public access to landing page and public routes.
    if (!user && !isAuthPath && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    if (user && isAuthPath && !pathname.startsWith('/auth/callback') && pathname !== '/auth/error') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (user && pathname.startsWith('/dashboard')) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      // Unknown or missing roles are rejected by canAccessDashboardPath.
      const role = profile?.role || user.app_metadata?.role || 'unauthorized'
      if (!canAccessDashboardPath(role, pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/error'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
