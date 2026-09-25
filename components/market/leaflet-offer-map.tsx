'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, MapPin } from 'lucide-react'

export type OfferMapItem = {
  propertyId: string
  sourceListingId: string
  title: string | null
  address: string | null
  neighborhood: string | null
  latitude: number
  longitude: number
  priceUf: number | null
  priceUfM2: number | null
  builtAreaM2: number | null
  landAreaM2: number | null
  bedrooms: number | null
  bathrooms: number | null
  daysPublished: number | null
  identityStatus: string | null
  observedAt: string | null
  sourceUrl: string | null
  lead: { id: string; status: string; priority: string; nextFollowUpAt: string | null } | null
  valuation: { id: string; status: string; confidence: string | null; estimatedValueUf: number | null } | null
  hasActiveAssignment: boolean
  territoryDirector: { key: string; name: string; office: string | null } | null
}

type LeafletBounds = { isValid(): boolean }
type LeafletMarker = {
  addTo(map: LeafletMap): LeafletMarker
  bindTooltip(content: string, options?: Record<string, unknown>): LeafletMarker
  on(event: string, handler: () => void): LeafletMarker
  setStyle(style: Record<string, unknown>): LeafletMarker
  bringToFront(): LeafletMarker
}
type LeafletMap = {
  fitBounds(bounds: LeafletBounds, options?: Record<string, unknown>): void
  panTo(latlng: [number, number], options?: Record<string, unknown>): void
  remove(): void
  invalidateSize(): void
}
type LeafletApi = {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap
  tileLayer(url: string, options?: Record<string, unknown>): { addTo(map: LeafletMap): unknown }
  circleMarker(latlng: [number, number], options?: Record<string, unknown>): LeafletMarker
  featureGroup(layers: LeafletMarker[]): { getBounds(): LeafletBounds }
}
const LEAFLET_VERSION = '1.9.4'
const SCRIPT_ID = 'pp-leaflet-js'
const STYLE_ID = 'pp-leaflet-css'

function ensureLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser_required'))
  const leafletWindow = window as typeof window & { L?: LeafletApi }
  if (leafletWindow.L) return Promise.resolve(leafletWindow.L)
  if (!document.getElementById(STYLE_ID)) {
    const link = document.createElement('link')
    link.id = STYLE_ID
    link.rel = 'stylesheet'
    link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
    document.head.appendChild(link)
  }
  return new Promise<LeafletApi>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => leafletWindow.L ? resolve(leafletWindow.L) : reject(new Error('leaflet_missing')))
      existing.addEventListener('error', () => reject(new Error('leaflet_load_failed')))
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
    script.async = true
    script.onload = () => leafletWindow.L ? resolve(leafletWindow.L) : reject(new Error('leaflet_missing'))
    script.onerror = () => reject(new Error('leaflet_load_failed'))
    document.head.appendChild(script)
  })
}

function uf(value: number | null) {
  return value == null ? '—' : `UF ${Math.round(value).toLocaleString('es-CL')}`
}
function number(value: number | null, digits = 0) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}
function identityLabel(value: string | null) {
  if (!value) return 'Sin estado'
  if (value === 'confirmed') return 'Identidad confirmada'
  if (value === 'candidate') return 'Identidad candidata'
  if (value === 'needs_review') return 'Identidad por revisar'
  return value.replaceAll('_', ' ')
}

const ACTIVE_LEADS = new Set(['new', 'assigned', 'contacting', 'qualified', 'valuation', 'proposal'])

function intelligenceState(item: OfferMapItem) {
  if (item.identityStatus !== 'confirmed') return 'review'
  if (item.lead && ACTIVE_LEADS.has(item.lead.status)) return 'lead'
  if (item.valuation) return 'valuation'
  if (!item.territoryDirector) return 'territory'
  if ((item.daysPublished ?? 0) >= 90) return 'stale'
  return 'ready'
}

function intelligenceLabel(item: OfferMapItem) {
  const state = intelligenceState(item)
  if (state === 'review') return 'Revisar identidad'
  if (state === 'lead') return 'Lead activo'
  if (state === 'valuation') return 'Con valorización'
  if (state === 'territory') return 'Sin director territorial'
  if (state === 'stale') return 'Alta permanencia'
  return 'Operación cubierta'
}

function markerPalette(item: OfferMapItem, mode: 'offer' | 'intelligence') {
  if (mode === 'offer') return { color: '#d7332b', fillColor: '#d7332b' }
  const state = intelligenceState(item)
  if (state === 'lead') return { color: '#74d6cf', fillColor: '#2a938b' }
  if (state === 'valuation') return { color: '#b3c8ff', fillColor: '#607fc5' }
  if (state === 'review' || state === 'territory') return { color: '#f0c96a', fillColor: '#b28a2e' }
  if (state === 'stale') return { color: '#ff8d87', fillColor: '#b84a44' }
  return { color: '#d6dedc', fillColor: '#71807d' }
}

export default function LeafletOfferMap({ items }: { items: OfferMapItem[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRefs = useRef(new Map<string, LeafletMarker>())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [neighborhood, setNeighborhood] = useState('all')
  const [minUf, setMinUf] = useState('')
  const [maxUf, setMaxUf] = useState('')
  const [bedrooms, setBedrooms] = useState('all')
  const [mode, setMode] = useState<'offer' | 'intelligence'>('intelligence')
  const [intelligenceFilter, setIntelligenceFilter] = useState('all')

  const neighborhoods = useMemo(
    () => [...new Set(items.map((item) => item.neighborhood).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  )

  const filtered = useMemo(() => {
    const min = minUf ? Number(minUf) : null
    const max = maxUf ? Number(maxUf) : null
    return items.filter((item) => {
      if (neighborhood !== 'all' && item.neighborhood !== neighborhood) return false
      if (min != null && item.priceUf != null && item.priceUf < min) return false
      if (max != null && item.priceUf != null && item.priceUf > max) return false
      if (bedrooms !== 'all' && item.bedrooms !== Number(bedrooms)) return false
      if (intelligenceFilter === 'identity_confirmed' && item.identityStatus !== 'confirmed') return false
      if (intelligenceFilter === 'identity_review' && item.identityStatus === 'confirmed') return false
      if (intelligenceFilter === 'active_lead' && !(item.lead && ACTIVE_LEADS.has(item.lead.status))) return false
      if (intelligenceFilter === 'no_lead' && item.lead) return false
      if (intelligenceFilter === 'valuation' && !item.valuation) return false
      if (intelligenceFilter === 'no_valuation' && item.valuation) return false
      if (intelligenceFilter === 'assigned' && !item.hasActiveAssignment) return false
      if (intelligenceFilter === 'unassigned' && item.hasActiveAssignment) return false
      if (intelligenceFilter === 'high_dom' && (item.daysPublished == null || item.daysPublished < 90)) return false
      if (intelligenceFilter === 'territory_missing' && item.territoryDirector) return false
      return true
    })
  }, [items, neighborhood, minUf, maxUf, bedrooms, intelligenceFilter])

  const selected = filtered.find((item) => item.propertyId === selectedId) ?? null

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return
    if (!filtered.length) {
      mapRef.current?.remove()
      mapRef.current = null
      markerRefs.current.clear()
      return
    }

    void ensureLeaflet().then((L) => {
      if (cancelled || !hostRef.current) return
      mapRef.current?.remove()
      markerRefs.current.clear()

      const map = L.map(hostRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      mapRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const markers: LeafletMarker[] = []
      for (const item of filtered) {
        const palette = markerPalette(item, mode)
        const marker = L.circleMarker([item.latitude, item.longitude], {
          radius: 6,
          color: palette.color,
          weight: 1.4,
          fillColor: palette.fillColor,
          fillOpacity: 0.82,
        })
        marker.bindTooltip(
          `<strong>${uf(item.priceUf)}</strong><br/>${item.neighborhood ?? 'Vitacura'} · ${number(item.builtAreaM2)} m²<br/>${intelligenceLabel(item)}`,
          { sticky: true, direction: 'top', className: 'pp-map-tooltip' },
        )
        marker.on('click', () => setSelectedId(item.propertyId))
        marker.addTo(map)
        markerRefs.current.set(item.propertyId, marker)
        markers.push(marker)
      }

      const bounds = L.featureGroup(markers).getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 })
      window.setTimeout(() => map.invalidateSize(), 80)
      setError(false)
    }).catch(() => { if (!cancelled) setError(true) })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRefs.current.clear()
    }
  }, [filtered, mode])

  useEffect(() => {
    for (const [propertyId, marker] of markerRefs.current.entries()) {
      const active = propertyId === selectedId
      const hovered = propertyId === hoveredId
      const item = filtered.find((row) => row.propertyId === propertyId)
      const palette = item ? markerPalette(item, mode) : { color: '#d7332b', fillColor: '#d7332b' }
      marker.setStyle({
        radius: active ? 8 : hovered ? 7 : mode === 'intelligence' ? 5 : 6,
        color: active || hovered ? '#ffffff' : palette.color,
        weight: active ? 2.2 : hovered ? 1.8 : 1.2,
        fillColor: palette.fillColor,
        fillOpacity: active ? 0.96 : hovered ? 0.92 : mode === 'intelligence' ? 0.72 : 0.82,
      })
      if (active || hovered) marker.bringToFront()
    }
  }, [selectedId, hoveredId, filtered, mode])

  function select(propertyId: string) {
    setSelectedId(propertyId)
    const item = filtered.find((row) => row.propertyId === propertyId)
    if (item) mapRef.current?.panTo([item.latitude, item.longitude], { animate: true })
    markerRefs.current.get(propertyId)?.bringToFront()
  }

  const intelligenceCounts = {
    leads: items.filter((item) => item.lead && ACTIVE_LEADS.has(item.lead.status)).length,
    valuations: items.filter((item) => item.valuation).length,
    identityReview: items.filter((item) => item.identityStatus !== 'confirmed').length,
    highDom: items.filter((item) => (item.daysPublished ?? 0) >= 90).length,
  }

  return <div className="overflow-hidden border border-white/10 bg-[#111513] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#171c19] px-4 py-3">
      <div className="flex items-center gap-1 border border-white/10 bg-[#0d110f] p-1 text-xs">
        <button type="button" aria-pressed={mode === 'offer'} onClick={() => setMode('offer')} className={`min-h-8 px-3 ${mode === 'offer' ? 'bg-[#f0ece4] text-[#111513]' : 'text-[var(--n3-text-muted)]'}`}>Oferta</button>
        <button type="button" aria-pressed={mode === 'intelligence'} onClick={() => setMode('intelligence')} className={`min-h-8 px-3 ${mode === 'intelligence' ? 'bg-[#f0ece4] text-[#111513]' : 'text-[var(--n3-text-muted)]'}`}>Inteligencia PP</button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--n3-text-muted)]">
        <span><strong className="text-[var(--n3-text-light)]">{intelligenceCounts.leads}</strong> leads activos</span>
        <span><strong className="text-[var(--n3-text-light)]">{intelligenceCounts.valuations}</strong> valorizadas</span>
        <span><strong className="text-[var(--n3-text-light)]">{intelligenceCounts.identityReview}</strong> revisar identidad</span>
        <span><strong className="text-[var(--n3-text-light)]">{intelligenceCounts.highDom}</strong> +90 días</span>
      </div>
    </div>

    <div className="grid gap-3 border-b border-white/10 bg-[#151a17] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.2fr)_repeat(3,minmax(120px,0.7fr))_auto]">
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio
        <select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="mt-1 min-h-10 w-full border border-white/15 bg-[#202622] px-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)]">
          <option value="all">Todos</option>
          {neighborhoods.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF mín.
        <input type="number" min="0" value={minUf} onChange={(event) => setMinUf(event.target.value)} inputMode="numeric" className="mt-1 min-h-10 w-full border border-white/15 bg-[#202622] px-2 text-xs normal-case tracking-normal" placeholder="Ej. 15000" />
      </label>
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF máx.
        <input type="number" min="0" value={maxUf} onChange={(event) => setMaxUf(event.target.value)} inputMode="numeric" className="mt-1 min-h-10 w-full border border-white/15 bg-[#202622] px-2 text-xs normal-case tracking-normal" placeholder="Ej. 35000" />
      </label>
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Dormitorios
        <select value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="mt-1 min-h-10 w-full border border-white/15 bg-[#202622] px-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)]">
          <option value="all">Todos</option>
          {[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="flex items-end text-xs text-[var(--n3-text-muted)]"><strong className="mr-1 text-[var(--n3-text-light)]">{filtered.length}</strong> visibles</div>
    </div>

    <div className="grid gap-4 border-b border-white/10 bg-[#171c19] px-4 py-3 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)] sm:items-end">
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Inteligencia PP
        <select value={intelligenceFilter} onChange={(event) => setIntelligenceFilter(event.target.value)} className="mt-1 min-h-10 w-full border border-white/15 bg-[#202622] px-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)]">
          <option value="all">Toda la oferta</option>
          <option value="active_lead">Lead activo</option>
          <option value="no_lead">Sin lead</option>
          <option value="valuation">Con valorización</option>
          <option value="no_valuation">Sin valorización</option>
          <option value="identity_confirmed">Identidad confirmada</option>
          <option value="identity_review">Identidad por revisar</option>
          <option value="assigned">Asignación activa</option>
          <option value="unassigned">Sin asignación activa</option>
          <option value="high_dom">Alta permanencia · 90+ días</option>
          <option value="territory_missing">Sin director territorial</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--n3-text-muted)]">
        <span>Señal PP basada sólo en trazabilidad canónica.</span>
        {mode === 'intelligence' ? <>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#2a938b]" /> Lead</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#607fc5]" /> Valorización</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b28a2e]" /> Revisar</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b84a44]" /> +90 días</span>
        </> : null}
      </div>
    </div>

    <div className="grid min-h-[620px] lg:grid-cols-[minmax(280px,32%)_minmax(0,68%)]">
      <aside className="max-h-[72vh] overflow-y-auto border-b border-white/10 bg-[#131815] lg:border-b-0 lg:border-r lg:border-white/10">
        {filtered.map((item) => {
          const active = item.propertyId === selectedId
          return <button
            key={item.propertyId}
            type="button"
            onClick={() => select(item.propertyId)}
            onMouseEnter={() => setHoveredId(item.propertyId)}
            onMouseLeave={() => setHoveredId(null)}
            className={`block w-full border-b border-white/[0.07] px-4 py-3 text-left transition-colors focus-visible:bg-[#242b27] ${active ? 'bg-[#242b27]' : 'hover:bg-white/[0.035]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--n3-text-light)]">{item.address || item.title || 'Propiedad'}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--n3-text-muted)]">{item.neighborhood || 'Vitacura'} · {intelligenceLabel(item)}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{uf(item.priceUf)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--n3-text-muted)]">
              <span>{number(item.builtAreaM2)} m² const.</span>
              <span>{number(item.landAreaM2)} m² terreno</span>
              <span>{item.bedrooms ?? '—'}D</span>
              <span>{item.bathrooms ?? '—'}B</span>
              <span>{item.daysPublished == null ? '—' : `${item.daysPublished} días`}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {item.lead && ACTIVE_LEADS.has(item.lead.status) ? <span className="border border-[#2a938b]/60 px-1.5 py-0.5 text-[#74d6cf]">Lead · {item.lead.status}</span> : null}
              {item.valuation ? <span className="border border-[#607fc5]/60 px-1.5 py-0.5 text-[#b3c8ff]">Valorización · {item.valuation.status}</span> : null}
              {item.hasActiveAssignment ? <span className="border border-white/15 px-1.5 py-0.5 text-[#56615b]">Asignada</span> : null}
              {item.territoryDirector ? <span className="border border-white/15 px-1.5 py-0.5 text-[#56615b]">{item.territoryDirector.name}</span> : null}
            </div>
          </button>
        })}
        {!filtered.length ? <div className="p-6 text-sm text-[var(--n3-text-muted)]">No hay propiedades que cumplan estos filtros.</div> : null}
      </aside>

      <div className="relative min-h-[620px] bg-[#d8d6cf]">
        {error ? <div className="flex h-full min-h-[620px] items-center justify-center p-8 text-sm text-[#58635d]">No fue posible cargar la base cartográfica.</div> : <>
          <div ref={hostRef} className="h-[72vh] min-h-[620px] w-full" aria-label="Mapa de propiedades vigentes en Vitacura" />
          {!filtered.length ? <div className="pp-map-light-overlay absolute inset-0 z-[450] flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm font-semibold text-[#18201c]">Sin propiedades para estos filtros</p>
              <p className="mt-1 text-xs text-[#657069]">Ajusta barrio, precio, dormitorios o la señal de Inteligencia PP.</p>
            </div>
          </div> : null}
        </>}

        <div className="pp-map-light-overlay pointer-events-none absolute left-4 top-4 z-[500] border px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#a72b25]">Oferta PP · Vitacura</p>
          <p className="mt-1 text-xs text-[#3e4742]">{mode === 'intelligence' ? 'Capa operacional Property Partners' : 'Mapa y lista sincronizados'}</p>
        </div>

        {selected ? <div className="pp-map-light-surface absolute bottom-4 right-4 z-[500] w-[min(390px,calc(100%-2rem))] border p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-md">
          <div className="flex items-start gap-3">
            <MapPin size={15} className="mt-0.5 shrink-0 text-[#b33a33]" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#b33a33]">Propiedad seleccionada</p>
              <h3 className="mt-1 truncate text-base font-medium text-[#18201c]">{selected.address || selected.title || 'Propiedad'}</h3>
              <p className="mt-1 text-xs text-[#657069]">{selected.neighborhood || 'Vitacura'} · {intelligenceLabel(selected)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 text-xs">
            <div><span className="block text-[#6f7873]">Precio</span><strong className="mt-1 block text-base text-[#18201c]">{uf(selected.priceUf)}</strong></div>
            <div><span className="block text-[#6f7873]">UF/m²</span><strong className="mt-1 block text-base text-[#18201c]">{number(selected.priceUfM2, 1)}</strong></div>
            <div><span className="block text-[#6f7873]">Construidos</span><strong className="mt-1 block text-[#18201c]">{number(selected.builtAreaM2)} m²</strong></div>
            <div><span className="block text-[#6f7873]">Publicada</span><strong className="mt-1 block text-[#18201c]">{selected.daysPublished == null ? '—' : `${selected.daysPublished} días`}</strong></div>
          </div>
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-[11px] text-[#56615b] sm:grid-cols-2">
            <div><span className="text-[#778079]">Lead PP</span><p className="mt-0.5 text-[#26302b]">{selected.lead ? `${selected.lead.status} · ${selected.lead.priority}` : 'Sin lead'}</p></div>
            <div><span className="text-[#778079]">Valorización</span><p className="mt-0.5 text-[#26302b]">{selected.valuation ? selected.valuation.status : 'Sin valorización'}</p></div>
            <div><span className="text-[#778079]">Director territorial</span><p className="mt-0.5 text-[#26302b]">{selected.territoryDirector?.name || 'Sin asignar'}</p></div>
            <div><span className="text-[#778079]">Asignación individual</span><p className="mt-0.5 text-[#26302b]">{selected.hasActiveAssignment ? 'Activa' : 'No registrada'}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/dashboard/properties/${selected.propertyId}`} className="inline-flex min-h-9 items-center border border-[#a72b25] bg-[#a72b25] px-3 text-xs font-semibold text-white hover:bg-[#8f302b]">Property 360</Link>
            <Link href="/dashboard/valuation" className="inline-flex min-h-9 items-center border border-black/15 px-3 text-xs text-[#26302b] hover:bg-black/[0.04]">Valorizador</Link>
            <Link href="/dashboard/properties/prospects" className="inline-flex min-h-9 items-center border border-black/15 px-3 text-xs text-[#26302b] hover:bg-black/[0.04]">Leads</Link>
            {selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 px-2 text-xs text-[#b33a33]">Portal <ExternalLink size={12} /></a> : null}
          </div>
        </div> : null}
      </div>
    </div>

    <style jsx global>{`
      .pp-map-tooltip {
        border: 1px solid rgba(215, 51, 43, 0.45) !important;
        border-radius: 0 !important;
        background: rgba(5, 8, 7, 0.94) !important;
        color: #edf4f3 !important;
        box-shadow: none !important;
        font-size: 11px !important;
        line-height: 1.45 !important;
        padding: 8px 10px !important;
      }
      .pp-map-tooltip:before { display: none !important; }
      .leaflet-tile-pane { filter: grayscale(0.72) saturate(0.45) brightness(1.04) contrast(0.9); }
      .leaflet-control-zoom a {
        background: #f3f0e8 !important;
        color: #1b231f !important;
        border-color: rgba(27, 35, 31, 0.16) !important;
      }
      .leaflet-control-zoom a:hover { background: #e5e1d8 !important; }
      .leaflet-control-attribution {
        background: rgba(244, 241, 233, 0.86) !important;
        color: rgba(27, 35, 31, 0.58) !important;
      }
      .leaflet-control-attribution a { color: #8f302b !important; }
    `}</style>
  </div>
}
