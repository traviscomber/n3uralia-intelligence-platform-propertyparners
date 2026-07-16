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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3 rounded-md bg-black px-3 py-1.5">
            <PPLogo className="h-7 w-auto" priority />
          </div>
          <p className="text-sm text-gray-600">Property Partners Vitacura</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <h1 className="text-base font-semibold mb-1 text-gray-900">Iniciar sesion</h1>
          <p className="text-sm mb-6 text-gray-600">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>
                Correo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-3 py-2.5 rounded text-sm bg-white text-gray-900 outline-none"
                style={{ border: '1px solid #e5e7eb' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>
                Contrasena
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded text-sm bg-white text-gray-900 outline-none"
                style={{ border: '1px solid #e5e7eb' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-colors"
              style={{ background: '#111111' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/auth/sign-up" className="text-xs hover:text-gray-900" style={{ color: '#374151' }}>
              ¿No tienes cuenta? <span className="font-medium" style={{ color: '#d61f2c' }}>Registrarse</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
