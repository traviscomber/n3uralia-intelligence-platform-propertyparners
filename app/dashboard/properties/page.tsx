'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, X, Home, CheckCircle, AlertCircle, Download, ArrowUpRight, MapPin } from 'lucide-react'

interface Property {
  id: string
  address: string
  neighborhood: string
  property_type: string
  listing_number?: string | null
  source_url?: string | null
  image_url?: string | null
  tags?: string[] | null
  source?: string | null
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
  'Vitacura Centro', 'Lo Castillo', 'Villa El Dorado', 'Lo Curro',
  'Santa Maria de Manquehue', 'Nueva Costanera', 'Jardin del Este', 'Las Hualtatas',
  'Las Tranqueras', 'Luis Pasteur', 'Juan XXIII', 'Estadio Manquehue',
]

const PROPERTY_TYPES = ['departamento', 'casa', 'oficina', 'local_comercial']
const PROPERTY_MODE_LABELS: Record<'houses' | 'departments' | 'all', string> = {
  houses: 'Casas',
  departments: 'Departamentos',
  all: 'Ambos',
}
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
  const [propertyMode, setPropertyMode] = useState<'houses' | 'departments' | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [tagQuery, setTagQuery] = useState('')
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
      showToast('error', 'Direccion, precio y superficie son requeridos')
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

  async function handleScrapeMode(mode: 'all' | 'houses' | 'departments') {
    setScraping(true)
    try {
      const res = await fetch(`/api/scrape/portal-inmobiliario?source=${mode}`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        const label = mode === 'houses'
          ? 'casas de Vitacura desde Portal Inmobiliario, TOCTOC Casas, TOCTOC Barrios Vitacura, icasas.cl Casas y Chilepropiedades Casas'
          : mode === 'departments'
            ? 'departamentos de Vitacura desde Portal Inmobiliario, TOCTOC, icasas.cl, Yapo y Chilepropiedades'
            : 'casas y departamentos de Vitacura desde las fuentes activas'
        showToast('success', `Scraping ${PROPERTY_MODE_LABELS[mode]}: ${json.inserted}/${json.scraped} propiedades importadas desde ${label}`)
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

  const normalizedSearch = search.toLowerCase().trim()
  const normalizedTagQuery = tagQuery.toLowerCase().trim()
  const filtered = properties.filter(p => {
    const modeValue = (p.property_type || '').toLowerCase()
    const matchMode =
      propertyMode === 'all'
        ? true
        : propertyMode === 'houses'
          ? modeValue.includes('casa')
          : modeValue.includes('depart')
    const tagText = [p.listing_number, p.source, ...(p.tags || [])].filter(Boolean).join(' ').toLowerCase()
    const matchSearch = normalizedSearch === ''
      || p.address.toLowerCase().includes(normalizedSearch)
      || p.neighborhood.toLowerCase().includes(normalizedSearch)
      || tagText.includes(normalizedSearch)
    const matchTag = normalizedTagQuery === '' || tagText.includes(normalizedTagQuery)
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchMode && matchSearch && matchTag && matchStatus
  })

  const houseCount = properties.filter((p) => (p.property_type || '').toLowerCase().includes('casa')).length
  const departmentCount = properties.filter((p) => (p.property_type || '').toLowerCase().includes('depart')).length
  const sourceCount = new Set(properties.map((p) => p.source).filter(Boolean)).size
  const avgPriceUf = properties.length > 0
    ? properties.reduce((sum, p) => sum + (Number.isFinite(p.price_uf) ? p.price_uf : 0), 0) / properties.length
    : 0
  const avgArea = properties.length > 0
    ? properties.reduce((sum, p) => sum + (Number.isFinite(p.area_m2) ? p.area_m2 : 0), 0) / properties.length
    : 0

  return (
    <div className="space-y-6 pb-10">
      <div
        className="rounded-3xl border p-6 md:p-8 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #f8fbfa 0%, #ffffff 55%, #eef6f3 100%)',
          borderColor: '#d8e5e2',
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ background: '#eef6f3', color: '#5f7f78', borderColor: '#d8e5e2' }}>
              <MapPin size={12} />
              Vitacura market intelligence
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Inventario de casas y departamentos
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base leading-6" style={{ color: '#5f6662' }}>
              Vista operativa para revisar inventario, leer tags rapidos, abrir la fuente original y sincronizar nuevas oportunidades
              sin perder foco en Vitacura.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Total cargadas</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{properties.length}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Casas</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{houseCount}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Deptos</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{departmentCount}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Fuentes</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{sourceCount || '-'}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Prom. UF</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{avgPriceUf ? avgPriceUf.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '-'}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Prom. m2</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{avgArea ? `${avgArea.toFixed(0)} m2` : '-'}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Modo</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{PROPERTY_MODE_LABELS[propertyMode]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#d8e5e2' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Control panel</p>
          <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
            {properties.length} propiedades cargadas · {houseCount} casas · {departmentCount} departamentos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
            {(['all', 'houses', 'departments'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPropertyMode(mode)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                style={{
                  background: propertyMode === mode ? '#8fb2aa' : 'transparent',
                  color: propertyMode === mode ? '#fff' : '#9ca9a3',
                }}
              >
                {PROPERTY_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
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
            onClick={() => handleScrapeMode('departments')}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#7c8db5' }}
          >
            <Download size={16} />
            {scraping ? 'Scrapeando...' : 'Sincronizar Depts'}
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
            Nueva propiedad
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
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Direccion *</label>
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
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Superficie m2 *</label>
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
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Banos</label>
              <input type="number" min="0" max="10" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            {/* Days on market */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Dias en mercado</label>
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
                    {tagResult.zona_prc && <span style={{ color: '#9ca9a3' }}>- Zona {tagResult.zona_prc}</span>}
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
            placeholder="Buscar por direccion, barrio o numero..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-900"
            style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
          />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca9a3' }} />
          <input
            value={tagQuery}
            onChange={e => setTagQuery(e.target.value)}
            placeholder="Buscar por tags rapidos (casa, depto, barrio, fuente)..."
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
            {properties.length === 0 ? 'No hay propiedades cargadas aun' : 'Sin resultados para tu busqueda'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
            {properties.length === 0 ? 'Usa el boton "Nueva propiedad" para agregar la primera' : 'Intenta con otro filtro'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] overflow-hidden" style={{ border: '1px solid #d8e5e2' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1450px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                  {['#', 'Foto', 'Direccion', 'Barrio', 'Tipo', 'Precio UF', 'UF/m2', 'Sup.', 'Dorm/Banos', 'Tags', 'Link', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, index) => {
                  const tags = (p.tags || []).slice(0, 4)
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-[#f8fbfa]" style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td className="px-4 py-4 text-xs font-semibold text-gray-500 align-top">{index + 1}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.address}
                              className="h-16 w-24 rounded-xl object-cover ring-1 ring-black/5"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-16 w-24 items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-black/5" style={{ background: 'linear-gradient(135deg, #8fb2aa 0%, #6b8e85 100%)' }}>
                              {((p.property_type || '').toLowerCase().includes('depart') ? 'Depto' : 'Casa')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900 max-w-[220px] align-top">
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{p.address}</span>
                          <span className="text-xs text-gray-500">{p.listing_number || p.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap align-top">{p.neighborhood}</td>
                      <td className="px-4 py-4 text-gray-600 capitalize align-top">
                        {((p.property_type || '').replace('_', ' '))}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-900 align-top">{p.price_uf?.toLocaleString('es-CL')}</td>
                      <td className="px-4 py-4 text-gray-600 align-top">{p.area_m2 ? (p.price_uf / p.area_m2).toFixed(1) : '-'}</td>
                      <td className="px-4 py-4 text-gray-600 align-top">{p.area_m2} m2</td>
                      <td className="px-4 py-4 text-gray-600 align-top">{p.bedrooms}D/{p.bathrooms}B</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                          {tags.map((tag) => (
                            <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: '#eef6f3', color: '#315249', border: '1px solid #d8e5e2' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {p.source_url ? (
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors hover:opacity-90"
                            style={{ color: '#315249', background: '#eef6f3', border: '1px solid #d8e5e2' }}
                          >
                            Abrir
                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: '#9ca9a3' }}>Sin link</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: STATUS_STYLE[p.status]?.bg || '#f5f5f5', color: STATUS_STYLE[p.status]?.text || '#666' }}>
                          {STATUS_STYLE[p.status]?.label || p.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                          <X size={14} style={{ color: '#9ca9a3' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3" style={{ borderTop: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <p className="text-xs" style={{ color: '#9ca9a3' }}>{filtered.length} de {properties.length} propiedades</p>
          </div>
        </div>
      )}
    </div>
  )
}
