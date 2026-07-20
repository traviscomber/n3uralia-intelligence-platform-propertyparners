'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, X, Home, CheckCircle, AlertCircle, Download, ArrowUpRight, MapPin } from 'lucide-react'

interface Property {
  id: string
  address: string
  neighborhood: string
  property_type: string
  description?: string | null
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

type DedupeAuditTrail = {
  survivor_id: string
  survivor_address: string
  incoming_id: string
  incoming_address: string
  neighborhood: string | null
  property_type: string | null
  source: string | null
  score: number
  reason: string
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
  vendido:        { bg: '#f9fafb', text: '#111111', label: 'Vendido' },
  reservado:      { bg: '#fef9c3', text: '#854d0e', label: 'Reservado' },
  captado:        { bg: '#ede9fe', text: '#5b21b6', label: 'Captado' },
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function derivePropertyType(property: Property) {
  const explicit = normalizeText(property.property_type || '')
  if (explicit.includes('casa')) return 'casa'
  if (explicit.includes('depart')) return 'departamento'

  const source = normalizeText(property.source || '')
  if (source.includes('house')) return 'casa'
  if (source.includes('depart') || source.includes('dept')) return 'departamento'

  const address = normalizeText(property.address || '')
  if (address.includes('casa') || address.includes('casona')) return 'casa'
  if (address.includes('depart') || address.includes('dpto') || address.includes('depto')) return 'departamento'

  return 'departamento'
}

function getFallbackSourceUrl(property: Property) {
  const kind = derivePropertyType(property)
  const source = normalizeText(property.source || '')

  if (source.includes('portal_inmobiliario')) {
    return kind === 'casa'
      ? 'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana'
      : 'https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana'
  }

  if (source.includes('toctoc')) {
    return kind === 'casa'
      ? 'https://www.toctoc.com/venta/casa/metropolitana/vitacura'
      : 'https://www.toctoc.com/venta/departamento/metropolitana/vitacura'
  }

  if (source.includes('icasas')) {
    return kind === 'casa'
      ? 'https://www.icasas.cl/venta/casas/santiago/vitacura'
      : 'https://www.icasas.cl/venta/departamentos/santiago/vitacura'
  }

  if (source.includes('chilepropiedades')) {
    return kind === 'casa'
      ? 'https://chilepropiedades.cl/propiedades/venta/casa/vitacura'
      : 'https://chilepropiedades.cl/propiedades/venta/departamento/vitacura'
  }

  if (source.includes('yapo')) {
    return 'https://www.yapo.cl/bienes-raices-venta-de-propiedades-apartamentos/region-metropolitana-vitacura'
  }

  if (source.includes('datainmobiliaria')) {
    return 'https://datainmobiliaria.cl/'
  }

  return null
}

function getDisplayTags(property: Property) {
  const tags = (property.tags || []).filter(Boolean)
  if (tags.length > 0) return tags
  return [
    derivePropertyType(property),
    property.neighborhood,
    property.source || 'vitacura',
    property.listing_number || property.id,
  ].filter(Boolean) as string[]
}

function StatCard({
  label,
  value,
  sub,
  tone = '#111111',
}: {
  label: string
  value: string
  sub: string
  tone?: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color: tone }}>{value}</p>
      <p className="mt-1 text-xs leading-5" style={{ color: '#6b7280' }}>{sub}</p>
    </div>
  )
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
  const [deduping, setDeduping] = useState(false)
  const [dedupeSummary, setDedupeSummary] = useState<{ merged: number; removed: number; survivors: number } | null>(null)
  const [dedupeAuditTrail, setDedupeAuditTrail] = useState<DedupeAuditTrail[]>([])
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

  async function handleDedupe() {
    setDeduping(true)
    try {
      const res = await fetch('/api/maintenance/dedupe-properties', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setDedupeSummary({ merged: json.merged, removed: json.removed, survivors: json.survivors })
        setDedupeAuditTrail((json.auditTrail || []) as DedupeAuditTrail[])
        showToast('success', `Dedupe completo: ${json.merged} consolidadas, ${json.removed} eliminadas`)
        await loadProperties()
      } else {
        showToast('error', json.error || 'No se pudo ejecutar el dedupe')
      }
    } catch (err) {
      showToast('error', `Error de red: ${(err as Error).message}`)
    } finally {
      setDeduping(false)
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
      || (p.description || '').toLowerCase().includes(normalizedSearch)
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
  const vitacuraMetrics = useMemo(() => {
    const rows = properties.filter((property) => {
      const text = normalizeText(`${property.address || ''} ${property.neighborhood || ''} ${property.source || ''}`)
      return text.includes('vitacura')
    })

    const now = Date.now()
    const recent24h = rows.filter((property) => now - new Date(property.created_at).getTime() <= 24 * 60 * 60 * 1000)
    const recent7d = rows.filter((property) => now - new Date(property.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000)
    const withImage = rows.filter((property) => Boolean(property.image_url)).length
    const withDescription = rows.filter((property) => Boolean(property.description && property.description.trim())).length
    const sourceCount = new Set(rows.map((property) => property.source).filter(Boolean)).size
    const avgDaysOnMarket = rows.length > 0
      ? rows.reduce((sum, property) => sum + (Number.isFinite(property.days_on_market) ? property.days_on_market : 0), 0) / rows.length
      : 0
    const avgPricePerM2 = rows.length > 0
      ? rows.reduce((sum, property) => {
          const area = Number.isFinite(property.area_m2) && property.area_m2 > 0 ? property.area_m2 : 0
          const price = Number.isFinite(property.price_uf) ? property.price_uf : 0
          return sum + (area > 0 ? price / area : 0)
        }, 0) / rows.length
      : 0
    const houseCount = rows.filter((property) => (property.property_type || '').toLowerCase().includes('casa')).length
    const departmentCount = rows.filter((property) => (property.property_type || '').toLowerCase().includes('depart')).length

    return {
      total: rows.length,
      recent24h: recent24h.length,
      recent7d: recent7d.length,
      withImage,
      withDescription,
      sourceCount,
      avgDaysOnMarket,
      avgPricePerM2,
      houseCount,
      departmentCount,
    }
  }, [properties])
  const imageCoverage = vitacuraMetrics.total > 0 ? Math.round((vitacuraMetrics.withImage / vitacuraMetrics.total) * 100) : 0
  const descriptionCoverage = vitacuraMetrics.total > 0 ? Math.round((vitacuraMetrics.withDescription / vitacuraMetrics.total) * 100) : 0
  const mixRatio = vitacuraMetrics.total > 0
    ? `${Math.round((vitacuraMetrics.houseCount / vitacuraMetrics.total) * 100)}% casas · ${Math.round((vitacuraMetrics.departmentCount / vitacuraMetrics.total) * 100)}% deptos`
    : 'Sin mix'

  return (
    <div className="space-y-6 pb-10">
      <div
        className="rounded-3xl border p-6 md:p-8 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #f8fbfa 0%, #ffffff 55%, #eef6f3 100%)',
          borderColor: '#e5e7eb',
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ background: '#eef6f3', color: '#5f7f78', borderColor: '#e5e7eb' }}>
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
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Total cargadas</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{properties.length}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Casas</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{houseCount}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Deptos</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{departmentCount}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Fuentes</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{sourceCount || '-'}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Prom. UF</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{avgPriceUf ? avgPriceUf.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '-'}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Prom. m2</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{avgArea ? `${avgArea.toFixed(0)} m2` : '-'}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Modo</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{PROPERTY_MODE_LABELS[propertyMode]}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Inventario Vitacura"
          value={String(vitacuraMetrics.total)}
          sub="fichas visibles en la vista"
          tone="var(--n3-teal)"
        />
        <StatCard
          label="Nuevas 24h"
          value={String(vitacuraMetrics.recent24h)}
          sub="propiedades sincronizadas hoy"
          tone="#111111"
        />
        <StatCard
          label="Nuevas 7d"
          value={String(vitacuraMetrics.recent7d)}
          sub="flujo reciente de mercado"
          tone="#111111"
        />
        <StatCard
          label="Cobertura visual"
          value={`${imageCoverage}%`}
          sub="propiedades con imagen utilizable"
          tone={imageCoverage >= 90 ? 'var(--n3-teal)' : imageCoverage >= 75 ? '#d97706' : '#dc2626'}
        />
        <StatCard
          label="Cobertura descriptiva"
          value={`${descriptionCoverage}%`}
          sub="propiedades con descripcion legible"
          tone={descriptionCoverage >= 90 ? 'var(--n3-teal)' : descriptionCoverage >= 75 ? '#d97706' : '#dc2626'}
        />
        <StatCard
          label="Mix operativo"
          value={mixRatio}
          sub={`${vitacuraMetrics.sourceCount} fuentes activas · prom. ${vitacuraMetrics.avgDaysOnMarket ? vitacuraMetrics.avgDaysOnMarket.toFixed(0) : '-'} dias · ${vitacuraMetrics.avgPricePerM2 ? vitacuraMetrics.avgPricePerM2.toFixed(1) : '-'} UF/m²`}
          tone="#111111"
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>Control panel</p>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            {properties.length} propiedades cargadas Â· {houseCount} casas Â· {departmentCount} departamentos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            {(['all', 'houses', 'departments'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPropertyMode(mode)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                style={{
                  background: propertyMode === mode ? 'var(--n3-teal)' : 'transparent',
                  color: propertyMode === mode ? '#fff' : '#6b7280',
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
            style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}
          >
            {showAdvancedScraping ? 'Avanzado ^' : 'Avanzado v'}
          </button>
          <button
            onClick={handleDedupe}
            disabled={deduping}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#fff', color: '#315249', border: '1px solid #e5e7eb' }}
          >
            {deduping ? 'Deduplicando...' : 'Dedupe fuerte'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--n3-teal)' }}
          >
            <Plus size={16} />
            Nueva propiedad
          </button>
        </div>
      </div>
      {showAdvancedScraping && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setGeneralBackfillEnabled((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              background: generalBackfillEnabled ? '#f9fafb' : '#fff',
              color: '#374151',
              border: '1px solid #e5e7eb',
            }}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full" style={{ background: generalBackfillEnabled ? '#6b8e85' : '#e5e7eb' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: '#fff' }} />
            </span>
            {generalBackfillEnabled ? 'General ON' : 'General OFF'}
          </button>
          <button
            onClick={() => handleScrapeMode('all')}
            disabled={scraping || !generalBackfillEnabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb' }}
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
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Agregar Propiedad</h2>
            <button onClick={() => setShowForm(false)}><X size={18} style={{ color: '#6b7280' }} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Address */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Direccion *</label>
              <input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Vitacura 1234, Dpto 502"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900 outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
            {/* Status */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Estado</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLE[s]?.label || s}</option>)}
              </select>
            </div>
            {/* Neighborhood */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Barrio</label>
              <select value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {/* Type */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Tipo</label>
              <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            {/* Price */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Precio UF *</label>
              <input type="number" value={form.price_uf} onChange={e => setForm({ ...form, price_uf: e.target.value })}
                placeholder="5000"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }} />
            </div>
            {/* Area */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Superficie m2 *</label>
              <input type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })}
                placeholder="80"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }} />
            </div>
            {/* Bedrooms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Dormitorios</label>
              <input type="number" min="0" max="10" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }} />
            </div>
            {/* Bathrooms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Banos</label>
              <input type="number" min="0" max="10" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }} />
            </div>
            {/* Days on market */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Dias en mercado</label>
              <input type="number" min="0" value={form.days_on_market} onChange={e => setForm({ ...form, days_on_market: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }} />
            </div>
            {/* Lat */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>
                Latitud (opcional)
              </label>
              <input
                type="number" step="any" value={form.lat}
                onChange={e => setForm({ ...form, lat: e.target.value })}
                onBlur={e => autoTagFromCoords(e.target.value, form.lng)}
                placeholder="-33.4172"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
            {/* Lng */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>
                Longitud (opcional)
              </label>
              <input
                type="number" step="any" value={form.lng}
                onChange={e => setForm({ ...form, lng: e.target.value })}
                onBlur={e => autoTagFromCoords(form.lat, e.target.value)}
                placeholder="-70.6060"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
            {/* Auto-tag result */}
            {(tagging || tagResult) && (
              <div className="lg:col-span-3 flex items-center gap-2 text-xs px-3 py-2 rounded-md"
                style={{ background: tagResult ? '#f9fafb' : '#f9fafb', border: '1px solid #e5e7eb', color: '#111111' }}>
                {tagging ? (
                  <span style={{ color: '#6b7280' }}>Detectando barrio desde coordenadas...</span>
                ) : tagResult ? (
                  <>
                    <span style={{ color: 'var(--n3-teal)' }}>Auto-detectado:</span>
                    <strong>{tagResult.barrio_nombre}</strong>
                    {tagResult.zona_prc && <span style={{ color: '#6b7280' }}>- Zona {tagResult.zona_prc}</span>}
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
              style={{ background: 'var(--n3-teal)' }}
            >
              {saving ? 'Guardando...' : 'Guardar Propiedad'}
            </button>
            <button
              onClick={() => { setForm(EMPTY_FORM); setShowForm(false) }}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(dedupeSummary || dedupeAuditTrail.length > 0) && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>Audit trail dedupe</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Ultimos merges consolidados</h2>
            </div>
            {dedupeSummary && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}>
                {dedupeSummary.merged} merges Â· {dedupeSummary.removed} eliminadas Â· {dedupeSummary.survivors} supervivientes
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dedupeAuditTrail.map((item) => (
              <div key={`${item.incoming_id}-${item.survivor_id}`} className="rounded-xl border p-4" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.incoming_address}</p>
                    <p className="mt-1 text-xs text-gray-600">Se consolido en: {item.survivor_address}</p>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: '#fff', color: 'var(--n3-teal)', border: '1px solid #f3d5d9' }}>
                    {item.score} pts
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-600">{item.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border px-2 py-1 text-[11px] text-gray-700" style={{ borderColor: '#e5e7eb' }}>{item.neighborhood || 'Sin barrio'}</span>
                  <span className="rounded-full border px-2 py-1 text-[11px] text-gray-700" style={{ borderColor: '#e5e7eb' }}>{item.property_type || 'Sin tipo'}</span>
                  <span className="rounded-full border px-2 py-1 text-[11px] text-gray-700" style={{ borderColor: '#e5e7eb' }}>{item.source || 'Sin fuente'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por direccion, barrio o numero..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-900"
            style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
          />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
          <input
            value={tagQuery}
            onChange={e => setTagQuery(e.target.value)}
            placeholder="Buscar por tags rapidos (casa, depto, barrio, fuente)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-900"
            style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          {(['all', ...STATUSES]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: filterStatus === s ? 'var(--n3-teal)' : 'transparent',
                color: filterStatus === s ? '#fff' : '#6b7280',
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
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e5e7eb', borderTopColor: 'var(--n3-teal)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <Home size={36} className="mx-auto mb-3" style={{ color: '#e5e7eb' }} />
          <p className="text-sm font-medium text-gray-900">
            {properties.length === 0 ? 'No hay propiedades cargadas aun' : 'Sin resultados para tu busqueda'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
            {properties.length === 0 ? 'Usa el boton "Nueva propiedad" para agregar la primera' : 'Intenta con otro filtro'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1450px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['#', 'Foto', 'Direccion', 'Barrio', 'Tipo', 'Precio UF', 'UF/m2', 'Sup.', 'Dorm/Banos', 'Tags', 'Link', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, index) => {
                  const tags = getDisplayTags(p).slice(0, 4)
                  const sourceUrl = p.source_url || getFallbackSourceUrl(p)
                  const typeLabel = derivePropertyType(p)
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
                            <div
                              className="flex h-16 w-24 flex-col items-center justify-center rounded-xl text-white ring-1 ring-black/5"
                              style={{ background: 'linear-gradient(135deg, var(--n3-teal) 0%, #6b8e85 100%)' }}
                            >
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{typeLabel === 'casa' ? 'Casa' : 'Depto'}</span>
                              <span className="mt-1 text-[9px] opacity-80">Sin foto</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#8c9691' }}>
                              {p.source || 'fuente'}
                            </p>
                            <p className="mt-1 max-w-[110px] truncate text-xs" style={{ color: '#5f6662' }}>
                              {typeLabel} Â· {p.neighborhood}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900 max-w-[220px] align-top">
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{p.address}</span>
                          {p.description ? <span className="line-clamp-2 text-xs font-normal text-gray-500">{p.description}</span> : null}
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
                            <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: '#eef6f3', color: '#315249', border: '1px solid #e5e7eb' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {p.source_url ? (
                          <a
                            href={sourceUrl || p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors hover:opacity-90"
                            style={{ color: '#315249', background: '#eef6f3', border: '1px solid #e5e7eb' }}
                          >
                            Abrir
                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          sourceUrl ? (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors hover:opacity-90"
                              style={{ color: '#315249', background: '#eef6f3', border: '1px solid #e5e7eb' }}
                            >
                              Ver fuente
                              <ArrowUpRight size={12} />
                            </a>
                          ) : (
                            <span className="text-xs" style={{ color: '#6b7280' }}>Sin link</span>
                          )
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
                          <X size={14} style={{ color: '#6b7280' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3" style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <p className="text-xs" style={{ color: '#6b7280' }}>{filtered.length} de {properties.length} propiedades</p>
          </div>
        </div>
      )}
    </div>
  )
}


