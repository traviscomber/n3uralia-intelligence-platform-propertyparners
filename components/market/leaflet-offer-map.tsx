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
  remove(): void
  invalidateSize(): void
}
type LeafletApi = {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap
  tileLayer(url: string, options?: Record<string, unknown>): { addTo(map: LeafletMap): unknown }
  circleMarker(latlng: [number, number], options?: Record<string, unknown>): LeafletMarker
  featureGroup(layers: LeafletMarker[]): { getBounds(): LeafletBounds }
}
declare global { interface Window { L?: LeafletApi } }

const LEAFLET_VERSION = '1.9.4'
const SCRIPT_ID = 'pp-leaflet-js'
const STYLE_ID = 'pp-leaflet-css'

function ensureLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser_required'))
  if (window.L) return Promise.resolve(window.L)
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
      existing.addEventListener('load', () => window.L ? resolve(window.L) : reject(new Error('leaflet_missing')))
      existing.addEventListener('error', () => reject(new Error('leaflet_load_failed')))
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
    script.async = true
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('leaflet_missing'))
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

export default function LeafletOfferMap({ items }: { items: OfferMapItem[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRefs = useRef(new Map<string, LeafletMarker>())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [neighborhood, setNeighborhood] = useState('all')
  const [minUf, setMinUf] = useState('')
  const [maxUf, setMaxUf] = useState('')
  const [bedrooms, setBedrooms] = useState('all')

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
      return true
    })
  }, [items, neighborhood, minUf, maxUf, bedrooms])

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
        const marker = L.circleMarker([item.latitude, item.longitude], {
          radius: 6,
          color: '#d7332b',
          weight: 1.4,
          fillColor: '#d7332b',
          fillOpacity: 0.78,
        })
        marker.bindTooltip(
          `<strong>${uf(item.priceUf)}</strong><br/>${item.neighborhood ?? 'Vitacura'} · ${number(item.builtAreaM2)} m²`,
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
  }, [filtered])

  useEffect(() => {
    for (const [propertyId, marker] of markerRefs.current.entries()) {
      const active = propertyId === selectedId
      marker.setStyle({
        radius: active ? 8 : 6,
        color: active ? '#ffffff' : '#d7332b',
        weight: active ? 2.2 : 1.4,
        fillColor: '#d7332b',
        fillOpacity: active ? 0.95 : 0.78,
      })
      if (active) marker.bringToFront()
    }
  }, [selectedId])

  function select(propertyId: string) {
    setSelectedId(propertyId)
    markerRefs.current.get(propertyId)?.bringToFront()
  }

  return <div className="border border-[var(--n3-line)] bg-[#070909]">
    <div className="grid gap-3 border-b border-[var(--n3-line)] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.2fr)_repeat(3,minmax(120px,0.7fr))_auto]">
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio
        <select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[#090b0b] px-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)]">
          <option value="all">Todos</option>
          {neighborhoods.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF mín.
        <input value={minUf} onChange={(event) => setMinUf(event.target.value)} inputMode="numeric" className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[#090b0b] px-2 text-xs normal-case tracking-normal" placeholder="Ej. 15000" />
      </label>
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF máx.
        <input value={maxUf} onChange={(event) => setMaxUf(event.target.value)} inputMode="numeric" className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[#090b0b] px-2 text-xs normal-case tracking-normal" placeholder="Ej. 35000" />
      </label>
      <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Dormitorios
        <select value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="mt-1 min-h-10 w-full border border-[var(--n3-line)] bg-[#090b0b] px-2 text-xs normal-case tracking-normal text-[var(--n3-text-light)]">
          <option value="all">Todos</option>
          {[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="flex items-end text-xs text-[var(--n3-text-muted)]"><strong className="mr-1 text-[var(--n3-text-light)]">{filtered.length}</strong> visibles</div>
    </div>

    <div className="grid min-h-[620px] lg:grid-cols-[minmax(300px,36%)_minmax(0,64%)]">
      <aside className="max-h-[72vh] overflow-y-auto border-b border-[var(--n3-line)] lg:border-b-0 lg:border-r">
        {filtered.map((item) => {
          const active = item.propertyId === selectedId
          return <button
            key={item.propertyId}
            type="button"
            onClick={() => select(item.propertyId)}
            className={`block w-full border-b border-[var(--n3-line)] px-4 py-4 text-left transition-colors ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.025]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--n3-text-light)]">{item.address || item.title || 'Propiedad'}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--n3-text-muted)]">{item.neighborhood || 'Vitacura'} · {identityLabel(item.identityStatus)}</p>
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
          </button>
        })}
        {!filtered.length ? <div className="p-6 text-sm text-[var(--n3-text-muted)]">No hay propiedades que cumplan estos filtros.</div> : null}
      </aside>

      <div className="relative min-h-[620px]">
        {error ? <div className="flex h-full min-h-[620px] items-center justify-center p-8 text-sm text-[var(--n3-text-muted)]">No fue posible cargar la base cartográfica.</div> : <div ref={hostRef} className="h-[72vh] min-h-[620px] w-full" aria-label="Mapa de casas vigentes en Vitacura" />}

        <div className="pointer-events-none absolute left-4 top-4 z-[500] border border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#ff766f]">Oferta PP · Vitacura</p>
          <p className="mt-1 text-xs text-white/70">Mapa y lista sincronizados</p>
        </div>

        {selected ? <div className="absolute bottom-4 right-4 z-[500] w-[min(390px,calc(100%-2rem))] border border-white/10 bg-black/90 p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <MapPin size={15} className="mt-0.5 shrink-0 text-[#ff766f]" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#ff766f]">Propiedad seleccionada</p>
              <h3 className="mt-1 truncate text-base font-medium text-white">{selected.address || selected.title || 'Propiedad'}</h3>
              <p className="mt-1 text-xs text-white/55">{selected.neighborhood || 'Vitacura'} · {identityLabel(selected.identityStatus)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 text-xs">
            <div><span className="block text-white/45">Precio</span><strong className="mt-1 block text-base text-white">{uf(selected.priceUf)}</strong></div>
            <div><span className="block text-white/45">UF/m²</span><strong className="mt-1 block text-base text-white">{number(selected.priceUfM2, 1)}</strong></div>
            <div><span className="block text-white/45">Construidos</span><strong className="mt-1 block text-white">{number(selected.builtAreaM2)} m²</strong></div>
            <div><span className="block text-white/45">Publicada</span><strong className="mt-1 block text-white">{selected.daysPublished == null ? '—' : `${selected.daysPublished} días`}</strong></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/dashboard/properties/${selected.propertyId}`} className="inline-flex min-h-9 items-center border border-[#d7332b] px-3 text-xs font-semibold text-white hover:bg-[#d7332b]/10">Property 360</Link>
            <Link href="/dashboard/valuation" className="inline-flex min-h-9 items-center border border-white/15 px-3 text-xs text-white/85 hover:bg-white/[0.04]">Valorizador</Link>
            <Link href="/dashboard/properties/prospects" className="inline-flex min-h-9 items-center border border-white/15 px-3 text-xs text-white/85 hover:bg-white/[0.04]">Leads</Link>
            {selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 px-2 text-xs text-[#ff766f]">Portal <ExternalLink size={12} /></a> : null}
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
      .leaflet-tile-pane { filter: grayscale(1) invert(1) brightness(0.34) contrast(1.25); }
      .leaflet-control-zoom a {
        background: #090b0b !important;
        color: #edf4f3 !important;
        border-color: rgba(215, 51, 43, 0.25) !important;
      }
      .leaflet-control-zoom a:hover { background: #141616 !important; }
      .leaflet-control-attribution {
        background: rgba(5, 8, 7, 0.72) !important;
        color: rgba(237, 244, 243, 0.45) !important;
      }
      .leaflet-control-attribution a { color: rgba(255, 118, 111, 0.78) !important; }
    `}</style>
  </div>
}
