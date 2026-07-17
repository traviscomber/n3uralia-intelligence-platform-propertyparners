'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, RefreshCw, Search, Users } from 'lucide-react'

type ProfileRow = {
  id: string
  full_name: string | null
  role: 'ceo' | 'director' | 'seller' | 'admin' | string
  team: string | null
  avatar_url: string | null
  created_at: string
}

type ProfileSummary = {
  total: number
  sellers: number
  directors: number
  admins: number
  ceos: number
  teams: number
}

type ProfileDirectoryResponse = {
  profiles?: ProfileRow[]
  summary?: ProfileSummary
  error?: string
}

export default function ProfileDirectory() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [team, setTeam] = useState('')
  const [search, setSearch] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '50')
    if (role) params.set('role', role)
    if (team) params.set('team', team)
    if (search) params.set('search', search)
    return params.toString()
  }, [role, search, team])

  const exportBaseUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('dataset', 'profiles')
    if (role) params.set('role', role)
    if (team) params.set('team', team)
    return `/api/reports/export${params.toString() ? `?${params.toString()}` : ''}`
  }, [role, team])
  const hasFilters = Boolean(role || team || search)

  async function loadProfiles() {
    setRefreshing(true)
    setError(null)
    try {
      const response = await fetch(`/api/profiles?${queryString}`, { cache: 'no-store' })
      const data = (await response.json()) as ProfileDirectoryResponse
      if (!response.ok) {
        throw new Error(data.error || 'No pudimos cargar los perfiles.')
      }

      setProfiles(data.profiles || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los perfiles.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  return (
    <div className="space-y-4" aria-busy={loading || refreshing}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: '#f9fafb', color: '#374151' }}>
            <Users size={13} />
            Directorio de perfiles
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Vista operativa de vendedores, directores y administradores con filtros y exportacion directa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadProfiles()}
            disabled={refreshing}
            aria-label="Refrescar directorio de perfiles"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#d61f2c' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refrescar
          </button>
          <a
            href={`${exportBaseUrl}${exportBaseUrl.includes('?') ? '&' : '?'}format=csv`}
            aria-label="Exportar perfiles en CSV"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: '#e5e7eb', background: '#fff', color: '#374151' }}
          >
            <Download size={14} />
            CSV
          </a>
          <a
            href={`${exportBaseUrl}${exportBaseUrl.includes('?') ? '&' : '?'}format=json`}
            aria-label="Exportar perfiles en JSON"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: '#e5e7eb', background: '#fff', color: '#374151' }}
          >
            <Download size={14} />
            JSON
          </a>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Vendedores', value: summary.sellers },
            { label: 'Directores', value: summary.directors },
            { label: 'Admins', value: summary.admins },
            { label: 'CEOs', value: summary.ceos },
            { label: 'Equipos', value: summary.teams },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border p-3" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
            Buscar
          </span>
          <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
            <Search size={14} style={{ color: '#d61f2c' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, email o equipo"
              aria-label="Buscar perfiles por nombre, email o equipo"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: '#111827' }}
            />
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
            Rol
          </span>
          <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
            <Filter size={14} style={{ color: '#d61f2c' }} />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Filtrar perfiles por rol"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: '#111827' }}
            >
              <option value="">Todos</option>
              <option value="seller">Vendedor</option>
              <option value="director">Director</option>
              <option value="admin">Admin</option>
              <option value="ceo">CEO</option>
            </select>
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
            Equipo
          </span>
          <input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="Ventas, operaciones..."
            aria-label="Filtrar perfiles por equipo"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#111827' }}
          />
        </label>
      </div>

      {hasFilters && (
        <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
          Filtros activos
        </p>
      )}

      {error && <p className="text-sm" style={{ color: '#b45309' }}>{error}</p>}

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
                <div className="h-4 w-40 rounded-full bg-gray-200" />
                <div className="mt-3 h-3 w-56 rounded-full bg-gray-200" />
                <div className="mt-3 h-3 w-32 rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        ) : profiles.length ? (
          profiles.map((profile) => (
            <div key={profile.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{profile.full_name || 'Sin nombre'}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: '#f9fafb', color: '#374151' }}>
                    {profile.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {profile.team || 'Sin equipo'} · {profile.id}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Creado {new Date(profile.created_at).toLocaleDateString('es-CL')}
                </p>
              </div>
              {profile.avatar_url ? (
                <a
                  href={profile.avatar_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}
                >
                  Ver avatar
                </a>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No hay perfiles para este filtro.</p>
        )}
      </div>
    </div>
  )
}

