'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Save, UserRound } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

type Props = {
  profile: Profile | null
  email: string | null | undefined
}

type FormState = {
  full_name: string
  avatar_url: string
}

function toFormState(profile: Profile | null): FormState {
  return {
    full_name: profile?.full_name || '',
    avatar_url: profile?.avatar_url || '',
  }
}

export default function ProfileEditor({ profile, email }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toFormState(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const avatarLetter = (form.full_name || email || 'U').charAt(0).toUpperCase()

  useEffect(() => {
    setForm(toFormState(profile))
  }, [profile])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          avatar_url: form.avatar_url,
        }),
      })

      const json = (await response.json()) as { error?: string; profile?: Profile }
      if (!response.ok || !json.profile) {
        throw new Error(json.error || 'No pudimos actualizar el perfil.')
      }

      setForm(toFormState(json.profile))
      setMessage('Perfil actualizado.')
      setTimeout(() => router.refresh(), 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: 'var(--n3-teal)' }}>
          {avatarLetter}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{form.full_name || 'Sin nombre'}</p>
          <p className="text-sm text-gray-600">{email || 'Sin email'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>Nombre completo</span>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Nombre y apellido"
            maxLength={160}
            className="min-h-11 w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--n3-teal)]"
            style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#111827' }}
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>URL del avatar</span>
          <input
            value={form.avatar_url}
            onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            placeholder="https://..."
            maxLength={500}
            className="min-h-11 w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--n3-teal)]"
            style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#111827' }}
          />
        </label>
      </div>

      <div className="rounded-xl border border-[var(--n3-line)] bg-black/5 px-3 py-2 text-xs text-gray-600">
        Equipo: <strong>{profile?.team || 'Sin equipo'}</strong>. El equipo y el rol sólo pueden modificarse desde administración autorizada.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal)] disabled:opacity-60"
          style={{ background: 'var(--n3-teal)' }}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: '#f9fafb', color: '#374151' }}>
          <UserRound size={13} /> Rol {profile?.role || 'seller'}
        </span>
      </div>

      {error && <p role="alert" className="text-sm" style={{ color: '#b45309' }}>{error}</p>}
      {message && <p role="status" aria-live="polite" className="text-sm" style={{ color: '#166534' }}>{message}</p>}
    </div>
  )
}
