'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'

type Role = 'ceo' | 'admin' | 'director' | 'subdirector' | 'seller'
type ProfileRow = {
  id: string
  full_name: string | null
  role: Role
  team: string | null
  created_at: string
}
type ResponseBody = { profiles?: ProfileRow[]; error?: string }

const roleLabel: Record<Role, string> = {
  ceo: 'CEO',
  admin: 'Administración',
  director: 'Directora',
  subdirector: 'Subdirectora',
  seller: 'Partner',
}

export default function UserAdministrationPanel() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/profiles?limit=200', { cache: 'no-store' })
      const body = await response.json() as ResponseBody
      if (!response.ok) throw new Error(body.error || 'No fue posible cargar los usuarios.')
      setProfiles(body.profiles || [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const teams = useMemo(
    () => [...new Set(profiles.map((profile) => profile.team).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es')),
    [profiles],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es')
    if (!q) return profiles
    return profiles.filter((profile) =>
      [profile.full_name, profile.team, roleLabel[profile.role]]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es').includes(q)),
    )
  }, [profiles, search])

  async function updateProfile(id: string, patch: Partial<Pick<ProfileRow, 'role' | 'team'>>) {
    const current = profiles.find((item) => item.id === id)
    if (!current) return

    setSavingId(id)
    setError(null)
    try {
      const response = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      const body = await response.json() as { profile?: ProfileRow; error?: string }
      if (!response.ok || !body.profile) throw new Error(body.error || 'No fue posible guardar el cambio.')
      setProfiles((items) => items.map((item) => item.id === id ? body.profile! : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el cambio.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[var(--n3-line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-light text-[var(--n3-text-light)]">Usuarios</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--n3-text-muted)]">
            Define el tipo de usuario y la oficina que determinan su alcance dentro de la plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-3 text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <label className="block max-w-md">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Buscar</span>
        <div className="mt-1 flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-3">
          <Search size={14} className="text-[var(--n3-text-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, oficina o tipo"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </label>

      {error ? <p role="alert" className="border border-[var(--n3-line)] p-3 text-sm text-[#f0c96a]">{error}</p> : null}

      <div className="border-t border-[var(--n3-line)]">
        {loading && !profiles.length ? (
          <p className="py-6 text-sm text-[var(--n3-text-muted)]">Cargando usuarios…</p>
        ) : visible.length ? visible.map((profile) => {
          const locked = profile.role === 'ceo'
          const saving = savingId === profile.id
          return (
            <div key={profile.id} className="grid gap-3 border-b border-[var(--n3-line)] py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(180px,.7fr)_minmax(180px,.8fr)] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--n3-text-light)]">{profile.full_name || 'Sin nombre'}</p>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{locked ? 'Rol protegido' : 'Acceso definido por tipo y oficina'}</p>
              </div>

              <label>
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Tipo de usuario</span>
                <select
                  value={profile.role}
                  disabled={locked || saving}
                  onChange={(event) => void updateProfile(profile.id, { role: event.target.value as Role })}
                  className="min-h-11 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm outline-none disabled:opacity-60"
                >
                  {locked ? <option value="ceo">CEO</option> : null}
                  <option value="director">Directora</option>
                  <option value="subdirector">Subdirectora</option>
                  <option value="seller">Partner</option>
                  <option value="admin">Administración</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Oficina / equipo</span>
                <input
                  key={`${profile.id}-${profile.team ?? ''}`}
                  defaultValue={profile.team || ''}
                  list="known-user-teams"
                  disabled={saving}
                  onBlur={(event) => {
                    const value = event.currentTarget.value.trim()
                    if (value !== (profile.team || '')) void updateProfile(profile.id, { team: value })
                  }}
                  className="min-h-11 w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-sm outline-none disabled:opacity-60"
                />
              </label>
            </div>
          )
        }) : <p className="py-6 text-sm text-[var(--n3-text-muted)]">No hay usuarios para este filtro.</p>}
      </div>

      <datalist id="known-user-teams">
        {teams.map((team) => <option key={team} value={team} />)}
      </datalist>

      <p className="text-xs text-[var(--n3-text-muted)]">
        El rol CEO está protegido. Las oficinas existentes aparecen como sugerencias para mantener la nomenclatura consistente.
      </p>
    </div>
  )
}
