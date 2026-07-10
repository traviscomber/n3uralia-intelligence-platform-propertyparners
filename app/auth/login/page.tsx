'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--n-bg)' }}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--n-primary)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white" /><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--n-fg)' }}>N3uralia</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>Inteligencia Inmobiliaria</p>
        </div>

        <div className="n-card p-6">
          <h1 className="text-base font-semibold mb-1" style={{ color: 'var(--n-fg)' }}>Iniciar sesión</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--n-fg-muted)' }}>Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="mb-4 p-3 rounded text-sm" style={{ background: 'var(--n-danger-muted)', color: 'var(--n-danger)', border: '1px solid rgba(239,68,68,0.4)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--n-fg-muted)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full px-3 py-2.5 rounded text-sm outline-none" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)', color: 'var(--n-fg)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--n-fg-muted)' }}>Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded text-sm outline-none" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)', color: 'var(--n-fg)' }} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded text-sm font-medium transition-opacity disabled:opacity-60" style={{ background: 'var(--n-primary)', color: 'white' }}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/auth/sign-up" className="text-xs" style={{ color: 'var(--n-fg-muted)' }}>
              ¿No tienes cuenta? <span style={{ color: 'var(--n-primary)' }}>Registrarse</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
