'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PPLogo } from '@/components/brand/pp-logo'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        data: { full_name: fullName, role: 'seller' },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--n3-black)]">
        <div className="w-full max-w-sm rounded-lg border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-8 text-center shadow-sm">
          <div className="mb-4 inline-flex w-56 items-center justify-center bg-black px-3 py-2">
            <PPLogo className="w-full" priority />
          </div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(139,169,167,0.08)' }}>
            <svg width="24" height="24" fill="none" stroke="var(--n3-teal)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mb-2 font-semibold text-[var(--n3-text-light)]">Revisa tu email</h2>
          <p className="text-sm" style={{ color: 'var(--n3-text-muted)' }}>
            Enviamos un enlace de confirmacion a <strong className="text-[var(--n3-text-light)]">{email}</strong>
          </p>
          <a href="/auth/login" className="mt-4 inline-block text-sm transition-opacity hover:opacity-80" style={{ color: 'var(--n3-teal)' }}>
            Volver al ingreso
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--n3-black)]">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex w-56 items-center justify-center bg-black px-3 py-2">
            <PPLogo className="w-full" priority />
          </div>
          <p className="text-sm" style={{ color: 'var(--n3-text-muted)' }}>Inteligencia de mercado Vitacura</p>
        </div>
        <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6 shadow-sm">
          <h1 className="mb-1 text-base font-semibold text-[var(--n3-text-light)]">Crear cuenta</h1>
          <p className="mb-6 text-sm" style={{ color: 'var(--n3-text-muted)' }}>Crea tu acceso a la plataforma Property Partners Vitacura</p>
          {error && <div className="mb-4 rounded border border-[var(--n3-line)] bg-[rgba(215,51,43,0.1)] p-3 text-sm" style={{ color: 'var(--n3-text-light)' }}>{error}</div>}
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--n3-text-muted)' }}>
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ana Garcia"
                className="w-full rounded bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none"
                style={{ border: '1px solid var(--n3-line)' }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--n3-text-muted)' }}>
                Correo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none"
                style={{ border: '1px solid var(--n3-line)' }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--n3-text-muted)' }}>
                Contrasena
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full rounded bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none"
                style={{ border: '1px solid var(--n3-line)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--n3-teal)', color: '#ffffff' }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/auth/login" className="text-xs transition-opacity hover:opacity-80" style={{ color: 'var(--n3-text-muted)' }}>
              Ya tienes cuenta? <span className="font-medium" style={{ color: 'var(--n3-teal)' }}>Iniciar sesion</span>
            </a>
          </div>

          <div className="mt-5 border-t border-[var(--n3-line)] pt-3 text-center text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>
            Powered by{' '}
            <a href="https://n3uralia.com" target="_blank" rel="noreferrer" className="font-medium hover:opacity-80" style={{ color: 'var(--n3-teal)' }}>
              N3uralia
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
