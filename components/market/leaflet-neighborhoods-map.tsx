'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ExternalLink, MapPin } from 'lucide-react'

export type MapGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

export type MapFeature = {
  id: string
  name: string
  properties: number
  partners: string[]
  geometry: MapGeometry
}

export type MapProperty = {
  id: string
  propertyId: string
  address: string
  lat: number
  lng: number
  priceUf: number | null
  priceUfM2: number | null
  areaM2: number | null
  bedrooms: number | null
  bathrooms: number | null
  neighborhood: string | null
  observedAt: string | null
  sourceCode: string
  url: string | null
  evidence: 'live' | 'historical'
}

type Props = {
  features: MapFeature[]
  properties: MapProperty[]
  sourceLabel: string
}

type LeafletLayer = {
  addTo(map: LeafletMap): LeafletLayer
  bindTooltip(content: string, options?: Record<string, unknown>): LeafletLayer
  on(event: string, handler: () => void): LeafletLayer
}

type LeafletBounds = {
  isValid(): boolean
}

type LeafletMap = {
  fitBounds(bounds: LeafletBounds, options?: Record<string, unknown>): void
  remove(): void
  invalidateSize(): void
}

type LeafletApi = {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer
  geoJSON(data: unknown, options?: Record<string, unknown>): LeafletLayer & { getBounds(): LeafletBounds }
  circleMarker(latlng: [number, number], options?: Record<string, unknown>): LeafletLayer
  featureGroup(layers: LeafletLayer[]): { getBounds(): LeafletBounds }
}

declare global {
  interface Window {
    L?: LeafletApi
  }
}

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

function asGeoJson(feature: MapFeature) {
  return {
    type: 'Feature',
    properties: { id: feature.id, name: feature.name, properties: feature.properties },
    geometry: feature.geometry,
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function fmt(value: number | null, digits = 0) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

function propertyTooltip(property: MapProperty) {
  const badge = property.evidence === 'live' ? 'Oferta live' : 'Evidencia histórica'
  return [
    `<strong>${escapeHtml(property.address)}</strong>`,
    `<span class="pp-map-tooltip__meta">${escapeHtml(property.neighborhood || 'Sin barrio')} · ${badge}</span>`,
    `<span class="pp-map-tooltip__metrics">UF ${fmt(property.priceUf)} · ${fmt(property.areaM2)} m² · ${property.bedrooms ?? '—'} dorm. · ${property.bathrooms ?? '—'} baños</span>`,
  ].join('<br/>')
}

export default function LeafletNeighborhoodsMap({ features, properties, sourceLabel }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [showHistorical, setShowHistorical] = useState(false)
  const [error, setError] = useState(false)

  const maxProperties = useMemo(
    () => Math.max(1, ...features.map((feature) => feature.properties)),
    [features],
  )
  const selected = features.find((feature) => feature.id === selectedId) ?? null
  const selectedProperty = properties.find((property) => property.id === selectedPropertyId) ?? null
  const liveCount = properties.filter((property) => property.evidence === 'live').length
  const historicalCount = properties.length - liveCount

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host || !features.length) return

    void ensureLeaflet().then((L) => {
      if (cancelled || !hostRef.current) return
      if (mapRef.current) mapRef.current.remove()

      const map = L.map(hostRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const layers: LeafletLayer[] = []
      for (const feature of features) {
        const intensity = feature.properties / maxProperties
        const layer = L.geoJSON(asGeoJson(feature), {
          style: {
            color: '#d7332b',
            weight: 1.3,
            opacity: 0.9,
            fillColor: '#d7332b',
            fillOpacity: 0.035 + intensity * 0.16,
          },
        })
        layer.bindTooltip(
          `<strong>${escapeHtml(feature.name)}</strong><br/>${feature.properties.toLocaleString('es-CL')} casas con territorio PP`,
          { sticky: true, direction: 'top', className: 'pp-map-tooltip' },
        )
        layer.on('click', () => {
          setSelectedPropertyId(null)
          setSelectedId(feature.id)
        })
        layer.addTo(map)
        layers.push(layer)
      }

      const visibleProperties = properties.filter((property) => property.evidence === 'live' || showHistorical)
      for (const property of visibleProperties) {
        const live = property.evidence === 'live'
        const marker = L.circleMarker([property.lat, property.lng], {
          radius: live ? 6 : 3.5,
          color: live ? '#ffffff' : '#92a8a4',
          weight: live ? 1.5 : 1,
          opacity: live ? 1 : 0.58,
          fillColor: live ? '#d7332b' : '#92a8a4',
          fillOpacity: live ? 0.92 : 0.38,
        })
        marker.bindTooltip(propertyTooltip(property), {
          sticky: true,
          direction: 'top',
          className: 'pp-map-tooltip pp-map-tooltip--property',
        })
        marker.on('click', () => {
          setSelectedId(null)
          setSelectedPropertyId(property.id)
        })
        marker.addTo(map)
        layers.push(marker)
      }

      const bounds = L.featureGroup(layers).getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 })

      window.setTimeout(() => map.invalidateSize(), 80)
      setError(false)
    }).catch(() => {
      if (!cancelled) setError(true)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [features, maxProperties, properties, showHistorical])

  return (
    <div className="relative min-w-0 overflow-hidden border border-[var(--n3-line)] bg-[#070909]">
      {error ? (
        <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-medium text-[var(--n3-text-light)]">No fue posible cargar la base cartográfica.</p>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--n3-text-muted)]">La geometría y las propiedades siguen disponibles en la base canónica. Reintenta cuando el proveedor cartográfico esté disponible.</p>
        </div>
      ) : (
        <div
          ref={hostRef}
          className="h-[clamp(560px,72vh,820px)] w-full"
          aria-label="Mapa de propiedades y barrios de Vitacura"
        />
      )}

      <div className="absolute left-4 top-4 z-[500] w-[min(380px,calc(100%-2rem))] border border-white/10 bg-black/88 p-4 backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff766f]">Vitacura · territorio PP</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Oferta live</p><p className="mt-1 text-xl font-semibold text-white">{liveCount}</p></div>
          <div><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Histórico geocodificado</p><p className="mt-1 text-xl font-semibold text-white">{historicalCount}</p></div>
        </div>
        <label className="mt-4 flex min-h-10 cursor-pointer items-center gap-3 border-t border-white/10 pt-3 text-xs text-white/75">
          <input
            type="checkbox"
            checked={showHistorical}
            onChange={(event) => setShowHistorical(event.target.checked)}
            className="h-4 w-4 accent-[#d7332b]"
          />
          Mostrar evidencia histórica
        </label>
      </div>

      <div className="absolute bottom-4 right-4 z-[500] w-[min(380px,calc(100%-2rem))] border border-white/10 bg-black/90 p-4 backdrop-blur-md">
        {selectedProperty ? (
          <>
            <div className="flex items-start gap-3">
              <MapPin size={15} className="mt-0.5 shrink-0 text-[#ff766f]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#ff766f]">{selectedProperty.evidence === 'live' ? 'Oferta live' : 'Evidencia histórica'}</p>
                <h3 className="mt-1 break-words text-base font-medium text-white">{selectedProperty.address}</h3>
                <p className="mt-1 text-xs text-white/55">{selectedProperty.neighborhood || 'Sin barrio canónico'}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-white/10 pt-3">
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Precio</p><p className="mt-1 text-sm font-semibold text-white">UF {fmt(selectedProperty.priceUf)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">UF/m²</p><p className="mt-1 text-sm font-semibold text-white">{fmt(selectedProperty.priceUfM2, 1)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Superficie</p><p className="mt-1 text-sm text-white/85">{fmt(selectedProperty.areaM2)} m²</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Programa</p><p className="mt-1 text-sm text-white/85">{selectedProperty.bedrooms ?? '—'}D · {selectedProperty.bathrooms ?? '—'}B</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/dashboard/properties/${selectedProperty.propertyId}`} className="inline-flex min-h-10 items-center gap-2 bg-[#d7332b] px-3 text-xs font-semibold text-white">
                Abrir Ficha 360 <ArrowRight size={12} aria-hidden="true" />
              </Link>
              {selectedProperty.url ? <a href={selectedProperty.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 border border-white/15 px-3 text-xs font-semibold text-white/80">
                Fuente <ExternalLink size={12} aria-hidden="true" />
              </a> : null}
            </div>
          </>
        ) : selected ? (
          <>
            <div className="flex items-start gap-3">
              <MapPin size={15} className="mt-0.5 shrink-0 text-[#ff766f]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#ff766f]">Barrio seleccionado</p>
                <h3 className="mt-1 text-lg font-medium text-white">{selected.name}</h3>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Casas PP</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">{selected.properties.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Responsables</p>
                <p className="mt-1 text-sm leading-5 text-white/80">{selected.partners.length ? selected.partners.join(' · ') : 'Sin asignación'}</p>
              </div>
            </div>
            <Link href="/dashboard/market/revisar-barrios" className="mt-4 inline-flex min-h-10 items-center gap-2 border border-[#d7332b] px-3 text-xs font-semibold text-white hover:bg-[#d7332b]/10">
              Revisar territorio <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#ff766f]">Explorar</p>
            <p className="mt-1 text-sm leading-5 text-white/80">Selecciona una propiedad para abrir su Ficha 360 o un barrio para revisar su territorio y responsables.</p>
            <div className="mt-4 flex items-center gap-5 border-t border-white/10 pt-3 text-[10px] text-white/55">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-white bg-[#d7332b]" /> Oferta live</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#92a8a4]/70" /> Histórico</span>
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden max-w-[52%] bg-black/70 px-3 py-2 text-[10px] leading-4 text-white/45 lg:block">
        {sourceLabel}
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
        .pp-map-tooltip:before {
          display: none !important;
        }
        .pp-map-tooltip__meta,
        .pp-map-tooltip__metrics {
          color: rgba(237, 244, 243, 0.65);
        }
        .leaflet-tile-pane {
          filter: grayscale(1) invert(1) brightness(0.34) contrast(1.25);
        }
        .leaflet-control-zoom a {
          background: #090b0b !important;
          color: #edf4f3 !important;
          border-color: rgba(215, 51, 43, 0.25) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #141616 !important;
        }
        .leaflet-control-attribution {
          background: rgba(5, 8, 7, 0.72) !important;
          color: rgba(237, 244, 243, 0.45) !important;
        }
        .leaflet-control-attribution a {
          color: rgba(255, 118, 111, 0.78) !important;
        }
      `}</style>
    </div>
  )
}
