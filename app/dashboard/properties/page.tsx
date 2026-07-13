'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, X, Home, CheckCircle, AlertCircle, Download } from 'lucide-react'

interface Property {
  id: string
  address: string
  neighborhood: string
  property_type: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  lat: number | null
  lng: number | null
  status: string
  days_on_market: number
  created_at: string
}

const NEIGHBORHOODS = [
  'Vitacura Centro', 'El Golf', 'La Dehesa', 'Nueva Costanera',
  'Costanera Sur', 'La Florida', 'Andres Bello', 'Huerfanos',
  'Apoquindo Alto', 'Alonso de Cordova', 'Manquehue',
]

const PROPERTY_TYPES = ['departamento', 'casa', 'oficina', 'local_comercial']
const STATUSES = ['activo', 'vendido', 'reservado', 'captado']

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  activo:         { bg: '#dcfce7', text: '#166534', label: 'Activo' },
  vendido:        { bg: '#e8f3f0', text: '#173634', label: 'Vendido' },
  reservado:      { bg: '#fef9c3', text: '#854d0e', label: 'Reservado' },
  captado:        { bg: '#ede9fe', text: '#5b21b6', label: 'Captado' },
}

const EMPTY_FORM = {
  address: '', neighborhood: 'Vitacura Centro', property_type: 'departamento',
  price_uf: '', area_m2: '', bedrooms: '3', bathrooms: '2',
  lat: '', lng: '', status: 'activo', days_on_market: '0',
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [tagging, setTagging] = useState(false)
  const [tagResult, setTagResult] = useState<{ barrio_nombre: string; zona_prc: string } | null>(null)
  const [scraping, setScraping] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [generalBackfillEnabled, setGeneralBackfillEnabled] = useState(false)
  const [showAdvancedScraping, setShowAdvancedScraping] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadProperties()
  }, [])

  async function autoTagFromCoords(lat: string, lng: string) {
    if (!lat || !lng) return
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (isNaN(latN) || isNaN(lngN)) return
    setTagging(true)
    setTagResult(null)
    const { data, error } = await supabase.rpc('tag_vitacura_point', { p_lat: latN, p_lng: lngN })
    setTagging(false)
    if (!error && data && data.length > 0) {
      const tag = data[0]
      setTagResult({ barrio_nombre: tag.barrio_nombre, zona_prc: tag.zona_prc })
      setForm(prev => ({ ...prev, neighborhood: tag.barrio_nombre }))
    } else {
      setTagResult(null)
    }
  }

  async function loadProperties() {
    setLoading(true)
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    setProperties(data || [])
    setLoading(false)
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave() {
    if (!form.address || !form.price_uf || !form.area_m2) {
      showToast('error', 'Dirección, precio y superficie son requeridos')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('properties').insert({
      address: form.address,
      neighborhood: form.neighborhood,
      property_type: form.property_type,
      price_uf: parseFloat(form.price_uf),
      area_m2: parseFloat(form.area_m2),
      bedrooms: parseInt(form.bedrooms),
      bathrooms: parseInt(form.bathrooms),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      status: form.status,
      days_on_market: parseInt(form.days_on_market),
    })
    setSaving(false)
    if (error) {
      showToast('error', error.message)
    } else {
      showToast('success', 'Propiedad agregada correctamente')
      setForm(EMPTY_FORM)
      setShowForm(false)
      loadProperties()
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (!error) {
      setProperties(prev => prev.filter(p => p.id !== id))
      showToast('success', 'Propiedad eliminada')
    }
  }

  async function handleScrapeMode(mode: 'all' | 'houses') {
    setScraping(true)
    try {
      const res = await fetch(`/api/scrape/portal-inmobiliario?source=${mode}`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        const label = mode === 'houses'
          ? 'casas de Vitacura desde Portal Inmobiliario, TOCTOC Casas, TOCTOC Barrios Vitacura, icasas.cl Casas y Chilepropiedades Casas'
          : 'Portal Inmobiliario, TOCTOC, TOCTOC Casas, icasas.cl, icasas.cl Casas, Yapo, Chilepropiedades y Chilepropiedades Casas'
        showToast('success', `Scraping ${mode === 'houses' ? 'casas' : 'completo'}: ${json.inserted}/${json.scraped} propiedades importadas desde ${label}`)
        await loadProperties()
      } else {
        showToast('error', `Error: ${json.error || 'Fallo al scraping'}`)
      }
    } catch (err) {
      showToast('error', `Error de red: ${(err as Error).message}`)
    } finally {
      setScraping(false)
    }
  }

  const filtered = properties.filter(p => {
    const matchSearch = search === '' || p.address.toLowerCase().includes(search.toLowerCase()) || p.neighborhood.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between pb-5" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Casas Vitacura</h1>
          <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>{properties.length} casas cargadas � foco operativo en Vitacura</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleScrapeMode('houses')}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#6b8e85' }}
          >
            <Download size={16} />
            {scraping ? 'Scrapeando...' : 'Sincronizar Casas'}
          </button>
          <button
            onClick={() => setShowAdvancedScraping((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}
          >
            {showAdvancedScraping ? 'Avanzado ^' : 'Avanzado v'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#8fb2aa' }}
          >
            <Plus size={16} />
            Nueva Propiedad
          </button>
        </div>
      </div>
      {showAdvancedScraping && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
          <button
            onClick={() => setGeneralBackfillEnabled((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              background: generalBackfillEnabled ? '#e8f3f0' : '#fff',
              color: '#555a56',
              border: '1px solid #d8e5e2',
            }}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full" style={{ background: generalBackfillEnabled ? '#6b8e85' : '#d8e5e2' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: '#fff' }} />
            </span>
            {generalBackfillEnabled ? 'General ON' : 'General OFF'}
          </button>
          <button
            onClick={() => handleScrapeMode('all')}
            disabled={scraping || !generalBackfillEnabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#fff', color: '#555a56', border: '1px solid #d8e5e2' }}
          >
            <Download size={16} />
            {scraping ? 'Scrapeando...' : generalBackfillEnabled ? 'Backfill General' : 'Backfill General (off)'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium" style={{
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Agregar Propiedad</h2>
            <button onClick={() => setShowForm(false)}><X size={18} style={{ color: '#9ca9a3' }} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Address */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Dirección *</label>
              <input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Vitacura 1234, Dpto 502"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900 outline-none focus:ring-2"
                style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
            {/* Status */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Estado</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLE[s]?.label || s}</option>)}
              </select>
            </div>
            {/* Neighborhood */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Barrio</label>
              <select value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {/* Type */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Tipo</label>
              <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            {/* Price */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Precio UF *</label>
              <input type="number" value={form.price_uf} onChange={e => setForm({ ...form, price_uf: e.target.value })}
                placeholder="5000"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            {/* Area */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Superficie m² *</label>
              <input type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })}
                placeholder="80"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            {/* Bedrooms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Dormitorios</label>
              <input type="number" min="0" max="10" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            {/* Bathrooms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Baños</label>
              <input type="number" min="0" max="10" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            {/* Days on market */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Días en mercado</label>
              <input type="number" min="0" value={form.days_on_market} onChange={e => setForm({ ...form, days_on_market: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            {/* Lat */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>
                Latitud (opcional)
              </label>
              <input
                type="number" step="any" value={form.lat}
                onChange={e => setForm({ ...form, lat: e.target.value })}
                onBlur={e => autoTagFromCoords(e.target.value, form.lng)}
                placeholder="-33.4172"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
            {/* Lng */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>
                Longitud (opcional)
              </label>
              <input
                type="number" step="any" value={form.lng}
                onChange={e => setForm({ ...form, lng: e.target.value })}
                onBlur={e => autoTagFromCoords(form.lat, e.target.value)}
                placeholder="-70.6060"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
            {/* Auto-tag result */}
            {(tagging || tagResult) && (
              <div className="lg:col-span-3 flex items-center gap-2 text-xs px-3 py-2 rounded-md"
                style={{ background: tagResult ? '#e8f3f0' : '#f5f9f7', border: '1px solid #d8e5e2', color: '#173634' }}>
                {tagging ? (
                  <span style={{ color: '#9ca9a3' }}>Detectando barrio desde coordenadas...</span>
                ) : tagResult ? (
                  <>
                    <span style={{ color: '#8fb2aa' }}>Auto-detectado:</span>
                    <strong>{tagResult.barrio_nombre}</strong>
                    {tagResult.zona_prc && <span style={{ color: '#9ca9a3' }}>· Zona {tagResult.zona_prc}</span>}
                  </>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#8fb2aa' }}
            >
              {saving ? 'Guardando...' : 'Guardar Propiedad'}
            </button>
            <button
              onClick={() => { setForm(EMPTY_FORM); setShowForm(false) }}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca9a3' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por dirección o barrio..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-900"
            style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
          {(['all', ...STATUSES]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: filterStatus === s ? '#8fb2aa' : 'transparent',
                color: filterStatus === s ? '#fff' : '#9ca9a3',
              }}
            >
              {s === 'all' ? 'Todos' : STATUS_STYLE[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#d8e5e2', borderTopColor: '#8fb2aa' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <Home size={36} className="mx-auto mb-3" style={{ color: '#d8e5e2' }} />
          <p className="text-sm font-medium text-gray-900">
            {properties.length === 0 ? 'No hay propiedades cargadas aún' : 'Sin resultados para tu búsqueda'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
            {properties.length === 0 ? 'Usa el botón "Nueva Propiedad" para agregar la primera' : 'Intenta con otro filtro'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ border: '1px solid #d8e5e2' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                {['Dirección', 'Barrio', 'Tipo', 'Precio UF', 'UF/m²', 'Sup.', 'Dorm/Baños', 'Días', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="transition-colors hover:bg-gray-50" style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{p.address}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.neighborhood}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.property_type?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.price_uf?.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-gray-600">{p.area_m2 ? (p.price_uf / p.area_m2).toFixed(1) : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.area_m2} m²</td>
                  <td className="px-4 py-3 text-gray-600">{p.bedrooms}D/{p.bathrooms}B</td>
                  <td className="px-4 py-3 text-gray-600">{p.days_on_market}d</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: STATUS_STYLE[p.status]?.bg || '#f5f5f5', color: STATUS_STYLE[p.status]?.text || '#666' }}>
                      {STATUS_STYLE[p.status]?.label || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                      <X size={14} style={{ color: '#9ca9a3' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3" style={{ borderTop: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <p className="text-xs" style={{ color: '#9ca9a3' }}>{filtered.length} de {properties.length} propiedades</p>
          </div>
        </div>
      )}
    </div>
  )
}

