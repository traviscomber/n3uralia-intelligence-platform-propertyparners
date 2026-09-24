'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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
  extend(bounds: LeafletBounds): LeafletBounds
  isValid(): boolean
}

type LeafletMap = {
  fitBounds(bounds: LeafletBounds, options?: Record<string, unknown>): void
  remove(): void
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
    link.integrity = 'sha256-p4NxAoJBhIINfQ3yn5qDqP8r9lUQvG7N1g+H8q4G9Hk='
    link.crossOrigin = ''
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
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const layers: LeafletLayer[] = []
      for (const feature of features) {
        const layer = L.geoJSON(asGeoJson(feature), {
          style: {
            color: '#35b9b5',
            weight: 1.2,
            opacity: 0.9,
            fillColor: '#35b9b5',
            fillOpacity: Math.min(0.12 + feature.properties / Math.max(1, ...features.map((item) => item.properties)) * 0.48, 0.6),
          },
        })
        layer.bindTooltip(`${feature.name} · ${feature.properties.toLocaleString('es-CL')} casas`, { sticky: true })
        layer.on('click', () => setSelectedId(feature.id))
        layer.addTo(map)
        layers.push(layer)
      }

      const bounds = L.featureGroup(layers).getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
      setError(false)
    }).catch(() => {
      if (!cancelled) setError(true)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [features])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-2">
        {error ? <div className="flex min-h-[540px] items-center justify-center p-8 text-sm text-[var(--n3-text-muted)]">No fue posible cargar la capa cartográfica. La geometría canónica permanece disponible.</div> : <div ref={hostRef} className="h-[540px] w-full" aria-label="Mapa Leaflet de barrios de Vitacura" />}
        <p className="mt-2 px-2 pb-1 text-[10px] text-[var(--n3-text-muted)]">{sourceLabel} · base cartográfica OpenStreetMap</p>
      </div>

      <aside className="border border-[var(--n3-line)] p-4">
        {selected ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Barrio</p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--n3-text-light)]">{selected.name}</h3>
            <p className="mt-3 text-sm text-[var(--n3-text-light)]">{selected.properties.toLocaleString('es-CL')} casa{selected.properties === 1 ? '' : 's'} asignada{selected.properties === 1 ? '' : 's'}</p>
            {selected.partners.length ? <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Ejecutivos: {selected.partners.join(' · ')}</p> : null}
            <Link href="/dashboard/market/revisar-barrios" className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[var(--primary)] px-3 text-xs font-semibold text-[var(--n3-text-light)]">Revisar territorio <ArrowRight size={12} aria-hidden="true" /></Link>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Territorio</p>
            <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">Selecciona un barrio en el mapa para revisar volumen de propiedades y responsables asignados.</p>
          </div>
        )}
      </aside>
    </div>
  )
}
