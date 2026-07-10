'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      email, password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        data: { full_name: fullName, role: 'seller' },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--n-bg)' }}>
      <div className="n-card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--n-success-muted)' }}>
          <svg width="24" height="24" fill="none" stroke="var(--n-success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--n-fg)' }}>Revisa tu email</h2>
        <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>Enviamos un enlace de confirmación a <strong style={{ color: 'var(--n-fg)' }}>{email}</strong></p>
        <a href="/auth/login" className="mt-4 inline-block text-sm" style={{ color: 'var(--n-primary)' }}>Volver al login</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--n-bg)' }}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--n-primary)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white" /><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
            </div>
            <span className="text-lg font-semibold" style={{ color: 'var(--n-fg)' }}>N3uralia</span>
          </div>
        </div>
        <div className="n-card p-6">
          {error && <div className="mb-4 p-3 rounded text-sm" style={{ background: 'var(--n-danger-muted)', color: 'var(--n-danger)' }}>{error}</div>}
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--n-fg-muted)' }}>Nombre completo</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ana García" className="w-full px-3 py-2.5 rounded text-sm outline-none" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)', color: 'var(--n-fg)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--n-fg-muted)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full px-3 py-2.5 rounded text-sm outline-none" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)', color: 'var(--n-fg)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--n-fg-muted)' }}>Contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded text-sm outline-none" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)', color: 'var(--n-fg)' }} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded text-sm font-medium disabled:opacity-60" style={{ background: 'var(--n-primary)', color: 'white' }}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/auth/login" className="text-xs" style={{ color: 'var(--n-fg-muted)' }}>
              ¿Ya tienes cuenta? <span style={{ color: 'var(--n-primary)' }}>Iniciar sesión</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
