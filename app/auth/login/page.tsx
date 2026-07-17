'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PPLogo } from '@/components/brand/pp-logo'

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--n3-black)]">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-md bg-[var(--n3-dark-surface)] px-3 py-1.5">
            <PPLogo className="h-7 w-auto" priority />
          </div>
          <p className="text-sm" style={{ color: 'var(--n3-text-muted)' }}>N3uralia</p>
        </div>

        <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6 shadow-sm">
          <h1 className="mb-1 text-base font-semibold text-[var(--n3-text-light)]">Iniciar sesion</h1>
          <p className="mb-6 text-sm" style={{ color: 'var(--n3-text-muted)' }}>Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="mb-4 rounded border border-[var(--n3-line)] bg-[rgba(139,169,167,0.08)] p-3 text-sm" style={{ color: 'var(--n3-text-light)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded bg-[var(--n3-black)] px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none"
                style={{ border: '1px solid var(--n3-line)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--n3-teal)', color: 'var(--n3-black)' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/auth/sign-up" className="text-xs hover:opacity-80" style={{ color: 'var(--n3-text-muted)' }}>
              ¿No tienes cuenta? <span className="font-medium" style={{ color: 'var(--n3-teal)' }}>Registrarse</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
