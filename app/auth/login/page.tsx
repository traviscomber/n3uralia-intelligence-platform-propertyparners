'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { defaultDashboardForRole } from '@/lib/access-control'
import type { UserRole } from '@/lib/types'
import { PPLogo } from '@/components/brand/pp-logo'

const VALID_ROLES = new Set<UserRole>(['ceo', 'admin', 'director', 'subdirector', 'seller'])

// Auditoría 2026-09-21 (Semana 2): Supabase devuelve mensajes de error en
// inglés; se localizan los conocidos para presentar siempre español al
// usuario. Mensajes no mapeados caen en el genérico, nunca en inglés crudo.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Credenciales inválidas. Verifica tu correo y contraseña.',
  'Invalid email or password': 'Credenciales inválidas. Verifica tu correo y contraseña.',
  'Email not confirmed': 'El correo no está confirmado. Contacta al administrador.',
  'Too many requests': 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  'User not found': 'No existe una cuenta registrada con ese correo.',
}

function localizeAuthError(message: string): string {
  return AUTH_ERROR_MESSAGES[message] ?? 'No fue posible iniciar sesión. Inténtalo de nuevo.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(signInError?.message ? localizeAuthError(signInError.message) : 'No fue posible iniciar sesión')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    const role = String(profile?.role || '').toLowerCase() as UserRole
    if (profileError || !VALID_ROLES.has(role)) {
      await supabase.auth.signOut()
      setError('La cuenta no tiene un perfil válido asignado')
      setLoading(false)
      return
    }

    router.replace(defaultDashboardForRole(role))
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--n3-black)] px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <PPLogo className="mx-auto w-56" priority />
          <p className="mt-4 text-sm text-[var(--n3-text-muted)]">Inteligencia de mercado Vitacura</p>
        </header>

        <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-6" aria-labelledby="login-title">
          <h1 id="login-title" className="mb-1 text-xl font-semibold text-[var(--n3-text-light)]">Iniciar sesión</h1>
          <p className="mb-6 text-sm leading-6 text-[var(--n3-text-muted)]">Accede al control de gestión e inteligencia comercial.</p>

          {error ? (
            <div role="alert" className="mb-4 border border-[#ff766f] bg-[#160d0c] p-3 text-sm text-[var(--n3-text-light)]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[var(--n3-text-muted)]">Correo</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--n3-black)]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[var(--n3-text-muted)]">Contraseña</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--n3-black)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--n3-text-muted)]">Acceso administrado internamente.</p>

          <div className="mt-5 border-t border-[var(--n3-line)] pt-3 text-center text-[11px] text-[var(--n3-text-muted)]">
            Powered by{' '}
            <a href="https://n3uralia.com" target="_blank" rel="noreferrer" className="font-medium text-[var(--n3-teal-soft)] hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              N3uralia
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
