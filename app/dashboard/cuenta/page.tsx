'use client'

import { FormEvent, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountSecurityPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (password.length < 10) {
      setStatus('error')
      setMessage('La nueva contraseña debe tener al menos 10 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Las contraseñas no coinciden.')
      return
    }

    setStatus('saving')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('error')
      setMessage('No fue posible actualizar la contraseña. Intenta nuevamente.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setStatus('success')
    setMessage('Contraseña actualizada correctamente.')
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[var(--n3-text-light)]">
          <KeyRound size={18} strokeWidth={1.6} />
          <h1 className="text-xl font-medium">Seguridad de la cuenta</h1>
        </div>
        <p className="text-sm text-[var(--n3-text-muted)]">
          Puedes cambiar tu contraseña cuando quieras. El cambio se aplica inmediatamente a tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <label className="block space-y-2 text-sm text-[var(--n3-text-light)]">
          <span>Nueva contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2 text-[var(--n3-text-light)] outline-none focus:border-[var(--n3-teal-soft)]"
            required
          />
        </label>

        <label className="block space-y-2 text-sm text-[var(--n3-text-light)]">
          <span>Confirmar nueva contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2 text-[var(--n3-text-light)] outline-none focus:border-[var(--n3-teal-soft)]"
            required
          />
        </label>

        {message ? (
          <p className={`text-sm ${status === 'success' ? 'text-[var(--chart-3)]' : 'text-[var(--chart-4)]'}`} role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="border border-[var(--n3-line)] px-4 py-2 text-sm text-[var(--n3-text-light)] transition-colors hover:bg-[var(--n3-black)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'saving' ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
