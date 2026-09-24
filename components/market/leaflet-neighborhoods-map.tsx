'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'

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

type Props = {
  features: MapFeature[]
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

export default function LeafletNeighborhoodsMap({ features, sourceLabel }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const maxProperties = useMemo(
    () => Math.max(1, ...features.map((feature) => feature.properties)),
    [features],
  )
  const selected = features.find((feature) => feature.id === selectedId) ?? null

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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(map)

      const layers: LeafletLayer[] = []
      for (const feature of features) {
        const intensity = feature.properties / maxProperties
        const layer = L.geoJSON(asGeoJson(feature), {
          style: {
            color: '#d7332b',
            weight: feature.id === selectedId ? 2.4 : 1.4,
            opacity: 0.95,
            fillColor: '#d7332b',
            fillOpacity: 0.08 + intensity * 0.34,
          },
        })
        layer.bindTooltip(
          `<strong>${feature.name}</strong><br/>${feature.properties.toLocaleString('es-CL')} casas asignadas`,
          { sticky: true, direction: 'top', className: 'pp-map-tooltip' },
        )
        layer.on('click', () => setSelectedId(feature.id))
        layer.addTo(map)
        layers.push(layer)
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
  }, [features, maxProperties, selectedId])

  return (
    <div className="relative min-w-0 overflow-hidden border border-[var(--n3-line)] bg-[#070909]">
      {error ? (
        <div className="flex min-h-[560px] items-center justify-center p-8 text-sm text-[var(--n3-text-muted)]">
          No fue posible cargar la base cartográfica. La geometría canónica permanece disponible.
        </div>
      ) : (
        <div
          ref={hostRef}
          className="h-[clamp(560px,68vh,780px)] w-full"
          aria-label="Mapa Leaflet de barrios de Vitacura"
        />
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[320px] border border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff766f]">Vitacura · territorio PP</p>
        <p className="mt-1 text-sm text-white">19 barrios canónicos</p>
        <p className="mt-1 text-[11px] leading-4 text-white/55">Intensidad = casas asignadas por barrio.</p>
      </div>

      <div className="absolute bottom-4 right-4 z-[500] w-[min(340px,calc(100%-2rem))] border border-white/10 bg-black/88 p-4 backdrop-blur-md">
        {selected ? (
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
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Casas</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">{selected.properties.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Ejecutivos</p>
                <p className="mt-1 text-sm leading-5 text-white/80">{selected.partners.length ? selected.partners.join(' · ') : 'Sin asignación'}</p>
              </div>
            </div>
            <Link href="/dashboard/market/revisar-barrios" className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[#d7332b] px-3 text-xs font-semibold text-white hover:bg-[#d7332b]/10">
              Revisar territorio <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#ff766f]">Explorar</p>
            <p className="mt-1 text-sm leading-5 text-white/80">Selecciona un barrio para ver casas asignadas y responsables.</p>
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
