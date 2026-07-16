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
  team: string
  avatar_url: string
}

function toFormState(profile: Profile | null): FormState {
  return {
    full_name: profile?.full_name || '',
    team: profile?.team || '',
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
          team: form.team,
          avatar_url: form.avatar_url,
        }),
      })

      const json = (await response.json()) as {
        error?: string
        profile?: Profile
      }

      if (!response.ok || !json.profile) {
        throw new Error(json.error || 'No pudimos actualizar el perfil.')
      }

      setForm(toFormState(json.profile))
      setMessage('Perfil actualizado.')
      setTimeout(() => {
        router.refresh()
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: '#8fb2aa' }}>
          {avatarLetter}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{form.full_name || 'Sin nombre'}</p>
          <p className="text-sm text-gray-600">{email || 'Sin email'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#9ca9a3' }}>
            Nombre completo
          </span>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Nombre y apellido"
            className="w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#9ca9a3' }}>
            Equipo
          </span>
          <input
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
            placeholder="Ventas, operaciones, etc."
            className="w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#9ca9a3' }}>
            URL del avatar
          </span>
          <input
            value={form.avatar_url}
            onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors"
            style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#8fb2aa' }}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: '#e8f3f0', color: '#555a56' }}>
          <UserRound size={13} />
          Rol {profile?.role || 'vendedor'}
        </span>
      </div>

      {error && <p className="text-sm" style={{ color: '#b45309' }}>{error}</p>}
      {message && <p className="text-sm" style={{ color: '#166534' }}>{message}</p>}
    </div>
  )
}
