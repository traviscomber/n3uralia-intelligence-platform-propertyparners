'use client'

import { useEffect, useRef, useState } from 'react'

interface Neighborhood {
  id: number
  name: string
  barrio_id: string
  velocity_days: number
  price_per_sqm_uf: number
  absorption_rate: number
  inventory_count: number
  zona_prc: string
  tipo: string
  geometry?: { type: string; coordinates: number[][][] }
}

interface PrcZone {
  id: number
  zona: string
  subzona: string
  uso_suelo: string
  geometry?: { type: string; coordinates: number[][][] }
}

interface Props {
  neighborhoods: Neighborhood[]
  prcZones: PrcZone[]
  selected: string | null
  onSelect: (barrio_id: string | null) => void
  showPrc: boolean
}

const TIPO_COLOR: Record<string, string> = {
  residencial_alto:       '#8fb2aa',
  residencial_medio_alto: '#b89a7e',
  residencial_medio:      '#10b981',
  comercial_servicios:    '#f59e0b',
}

export default function VitacuraMap({ neighborhoods, prcZones, selected, onSelect, showPrc }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const LRef         = useRef<any>(null)
  const layersRef    = useRef<any[]>([])
  const prcLayersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)

  // ── Init map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then((L) => {
      if (mapRef.current) return // guard against double-init in React strict mode

      // Fix broken default icon URLs in webpack builds
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center:      [-33.395, -70.593],
        zoom:        14,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      LRef.current   = L
      setMapReady(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        LRef.current   = null
      }
    }
  }, [])

  // ── Draw neighborhood polygons whenever map is ready or data changes ──
  useEffect(() => {
    const map = mapRef.current
    const L   = LRef.current
    if (!map || !L || !neighborhoods.length) return

    layersRef.current.forEach(l => l.remove())
    layersRef.current = []

    const allBounds: any[] = []

    neighborhoods.forEach((n) => {
      if (!n.geometry) return
      const color      = TIPO_COLOR[n.tipo] || '#8fb2aa'
      const isSelected = n.barrio_id === selected

      // Wrap raw geometry as a GeoJSON Feature so L.geoJSON handles it reliably
      const feature = { type: 'Feature', geometry: n.geometry, properties: {} }

      const layer = L.geoJSON(feature, {
        style: {
          color:       isSelected ? '#1a3a35' : '#fff',
          weight:      isSelected ? 3 : 1,
          fillColor:   color,
          fillOpacity: isSelected ? 0.65 : 0.45,
        },
      })
      .bindTooltip(`
        <div style="font-family:sans-serif;min-width:160px">
          <strong style="font-size:13px">${n.name}</strong><br/>
          <span style="color:#666;font-size:11px">Zona ${n.zona_prc ?? '—'} · ${(n.tipo ?? '').replace(/_/g,' ')}</span>
          <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
            <span>UF/m²: <strong>${n.price_per_sqm_uf?.toFixed(1) ?? '—'}</strong></span>
            <span>Vel: <strong>${n.velocity_days ?? '—'}d</strong></span>
            <span>Abs: <strong>${n.absorption_rate != null ? (n.absorption_rate * 100).toFixed(0) : '—'}%</strong></span>
            <span>Inv: <strong>${n.inventory_count ?? '—'}</strong></span>
          </div>
        </div>
      `, { sticky: true })
      .on('click', () => onSelect(n.barrio_id === selected ? null : n.barrio_id))
      .addTo(map)

      try { allBounds.push(layer.getBounds()) } catch {}
      layersRef.current.push(layer)
    })

    // Zoom to fit all polygons on first draw
    if (allBounds.length > 0) {
      const combined = allBounds.reduce((acc, b) => acc.extend(b))
      map.fitBounds(combined, { padding: [32, 32] })
    }
  }, [mapReady, neighborhoods, selected])

  // ── Draw PRC overlay ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const L   = LRef.current
    if (!map || !L) return

    prcLayersRef.current.forEach(l => l.remove())
    prcLayersRef.current = []

    if (!showPrc || !prcZones.length) return

    prcZones.forEach((z) => {
      if (!z.geometry) return
      const feature = { type: 'Feature', geometry: z.geometry, properties: {} }
      const layer = L.geoJSON(feature, {
        style: {
          color:       '#7c3aed',
          weight:      1.5,
          fillColor:   '#7c3aed',
          fillOpacity: 0.08,
          dashArray:   '5 5',
        },
      })
      .bindTooltip(`
        <strong>${z.zona}</strong>${z.subzona ? ` / ${z.subzona}` : ''}<br/>
        <span style="font-size:11px;color:#666">${z.uso_suelo || ''}</span>
      `, { sticky: true })
      .addTo(map)

      prcLayersRef.current.push(layer)
    })
  }, [mapReady, prcZones, showPrc])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '8px', zIndex: 0 }} />
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, right: 12, zIndex: 999,
        background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '8px 12px',
        fontSize: 11, boxShadow: '0 1px 6px rgba(0,0,0,0.12)', pointerEvents: 'none',
      }}>
        {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
          <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: color, display: 'inline-block' }} />
            <span style={{ color: '#555' }}>{tipo.replace(/_/g, ' ')}</span>
          </div>
        ))}
        {showPrc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, borderTop: '1px solid #eee', paddingTop: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#7c3aed', display: 'inline-block', opacity: 0.4 }} />
            <span style={{ color: '#555' }}>Zona PRC</span>
          </div>
        )}
      </div>
    </div>
  )
}
