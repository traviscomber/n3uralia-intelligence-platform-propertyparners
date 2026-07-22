import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Skip auth enforcement in development for faster iteration
  if (process.env.NODE_ENV !== 'development') {
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthPath = request.nextUrl.pathname.startsWith('/auth')
    const isLandingPage = request.nextUrl.pathname === '/'
    const isLegacyMarketingPath = request.nextUrl.pathname === '/es' || request.nextUrl.pathname.startsWith('/es/')
    const isPublicPath = isLandingPage || request.nextUrl.pathname.startsWith('/about') || request.nextUrl.pathname.startsWith('/contact')

    // This deployment is the private Property Partners portal. Keep legacy
    // N3uralia marketing pages out of the production navigation for every user.
    if (isLegacyMarketingPath) {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/dashboard' : '/auth/login'
      return NextResponse.redirect(url)
    }

    // Allow public access to landing page and public routes
    if (!user && !isAuthPath && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    if (user && isAuthPath && !request.nextUrl.pathname.startsWith('/auth/callback')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const role = profile?.role || user.user_metadata?.role || 'seller'
      const executiveOnly = ['/dashboard/ceo', '/dashboard/settings', '/dashboard/sources', '/dashboard/market/import', '/dashboard/knowledge']
      const directorOrExecutive = ['/dashboard/director', '/dashboard/control']
      const needsExecutive = executiveOnly.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))
      const needsDirector = directorOrExecutive.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))
      const isExecutive = role === 'admin' || role === 'ceo'
      const isDirector = isExecutive || role === 'director'

      if ((needsExecutive && !isExecutive) || (needsDirector && !isDirector)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
