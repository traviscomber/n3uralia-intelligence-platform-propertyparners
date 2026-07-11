'use client'

import { useEffect, useRef } from 'react'

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
  geometry?: any
}

interface PrcZone {
  id: number
  zona: string
  subzona: string
  uso_suelo: string
  geometry?: any
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
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<any[]>([])
  const prcLayersRef = useRef<any[]>([])

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return // already initialized

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Dynamically import leaflet (SSR safe)
    import('leaflet').then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [-33.395, -70.593],
        zoom: 14,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Draw neighborhood polygons
  useEffect(() => {
    if (!mapRef.current || !neighborhoods.length) return
    import('leaflet').then((L) => {
      // Clear existing layers
      layersRef.current.forEach(l => l.remove())
      layersRef.current = []

      const allBounds: any[] = []

      neighborhoods.forEach((n) => {
        if (!n.geometry) return
        const color = TIPO_COLOR[n.tipo] || '#8fb2aa'
        const isSelected = n.barrio_id === selected
        const layer = L.geoJSON(n.geometry, {
          style: {
            color: isSelected ? '#1a3a35' : color,
            weight: isSelected ? 2.5 : 1.5,
            fillColor: color,
            fillOpacity: isSelected ? 0.55 : 0.35,
          },
        })
        .bindTooltip(`
          <div style="font-family:sans-serif;min-width:160px">
            <strong style="font-size:13px">${n.name}</strong><br/>
            <span style="color:#666;font-size:11px">Zona ${n.zona_prc ?? '—'} · ${(n.tipo ?? '').replace(/_/g,' ')}</span><br/>
            <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
              <span>UF/m²: <strong>${n.price_per_sqm_uf?.toFixed(1) ?? '—'}</strong></span>
              <span>Vel: <strong>${n.velocity_days ?? '—'}d</strong></span>
              <span>Abs: <strong>${n.absorption_rate != null ? (n.absorption_rate*100).toFixed(0) : '—'}%</strong></span>
              <span>Inv: <strong>${n.inventory_count ?? '—'}</strong></span>
            </div>
          </div>
        `, { sticky: true })
        .on('click', () => onSelect(n.barrio_id === selected ? null : n.barrio_id))
        .addTo(mapRef.current)

        try { allBounds.push(layer.getBounds()) } catch {}
        layersRef.current.push(layer)
      })

      // Fit map to all polygon bounds on first draw
      if (allBounds.length > 0) {
        const combined = allBounds.reduce((acc, b) => acc.extend(b))
        mapRef.current.fitBounds(combined, { padding: [24, 24] })
      }
    })
  }, [neighborhoods, selected])

  // Draw PRC zones overlay
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => {
      prcLayersRef.current.forEach(l => l.remove())
      prcLayersRef.current = []

      if (!showPrc || !prcZones.length) return

      prcZones.forEach((z) => {
        if (!z.geometry) return
        const layer = L.geoJSON(z.geometry, {
          style: {
            color: '#7c3aed',
            weight: 1,
            fillColor: '#7c3aed',
            fillOpacity: 0.08,
            dashArray: '4 4',
          },
        }).bindTooltip(`
          <strong>${z.zona}</strong>${z.subzona ? ` / ${z.subzona}` : ''}<br/>
          <span style="font-size:11px;color:#666">${z.uso_suelo || ''}</span>
        `, { sticky: true })
        .addTo(mapRef.current)
        prcLayersRef.current.push(layer)
      })
    })
  }, [prcZones, showPrc])

  return <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '8px', zIndex: 0 }} />
}
