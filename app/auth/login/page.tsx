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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white" /><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">N3uralia</span>
          </div>
          <p className="text-sm text-gray-600">Inteligencia Inmobiliaria</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h1 className="text-base font-semibold mb-1 text-gray-900">Iniciar sesión</h1>
          <p className="text-sm mb-6 text-gray-600">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full px-3 py-2.5 rounded text-sm border border-gray-300 bg-white text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded text-sm border border-gray-300 bg-white text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/auth/sign-up" className="text-xs text-gray-600 hover:text-gray-900">
              ¿No tienes cuenta? <span className="text-blue-600 font-medium">Registrarse</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
