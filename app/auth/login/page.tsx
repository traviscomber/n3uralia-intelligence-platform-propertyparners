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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8fb2aa' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white" /><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">N3uralia</span>
          </div>
          <p className="text-sm text-gray-600">Inteligencia Inmobiliaria</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <h1 className="text-base font-semibold mb-1 text-gray-900">Iniciar sesion</h1>
          <p className="text-sm mb-6 text-gray-600">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#555a56' }}>Correo</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" className="w-full px-3 py-2.5 rounded text-sm bg-white text-gray-900 outline-none" style={{ border: '1px solid #d8e5e2' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#555a56' }}>Contrasena</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className="w-full px-3 py-2.5 rounded text-sm bg-white text-gray-900 outline-none" style={{ border: '1px solid #d8e5e2' }} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-colors" style={{ background: '#8fb2aa' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/auth/sign-up" className="text-xs hover:text-gray-900" style={{ color: '#555a56' }}>
              ?No tienes cuenta? <span className="font-medium" style={{ color: '#8fb2aa' }}>Registrarse</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

