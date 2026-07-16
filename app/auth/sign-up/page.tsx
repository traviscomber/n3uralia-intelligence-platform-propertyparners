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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <div className="inline-flex items-center justify-center mb-4 rounded-md bg-black px-3 py-1.5">
            <PPLogo className="h-7 w-auto" priority />
          </div>
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#f9fafb' }}>
            <svg width="24" height="24" fill="none" stroke="#d61f2c" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-semibold mb-2 text-gray-900">Revisa tu email</h2>
          <p className="text-sm text-gray-600">
            Enviamos un enlace de confirmacion a <strong className="text-gray-900">{email}</strong>
          </p>
          <a href="/auth/login" className="mt-4 inline-block text-sm hover:opacity-80 transition-opacity" style={{ color: '#d61f2c' }}>
            Volver al ingreso
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3 rounded-md bg-black px-3 py-1.5">
            <PPLogo className="h-7 w-auto" priority />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <h1 className="text-base font-semibold mb-1 text-gray-900">Crear cuenta</h1>
          <p className="text-sm mb-6 text-gray-600">Unete a Property Partners y accede a inteligencia inmobiliaria</p>
          {error && <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-600 border border-red-200">{error}</div>}
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ana Garcia"
                className="w-full px-3 py-2.5 rounded text-sm bg-white text-gray-900 outline-none"
                style={{ border: '1px solid #e5e7eb' }}
              />
            </div>
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
                minLength={6}
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/auth/login" className="text-xs hover:text-gray-900" style={{ color: '#374151' }}>
              ¿Ya tienes cuenta? <span className="font-medium" style={{ color: '#d61f2c' }}>Iniciar sesion</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
