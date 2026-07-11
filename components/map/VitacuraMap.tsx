'use client'

import { useEffect, useRef, useState } from 'react'

export interface Neighborhood {
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

export interface PrcZone {
  id: number
  zona: string
  subzona: string
  uso_suelo: string
  geometry?: { type: string; coordinates: number[][][] }
}

export interface Property {
  id: number
  lat: number
  lng: number
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  status: 'available' | 'sold' | 'reserved'
  days_on_market: number
  barrio_id: string
}

export interface VitacuraMapProps {
  neighborhoods: Neighborhood[]
  prcZones: PrcZone[]
  properties: Property[]
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

// Función para obtener badge de status basado en absorption rate
const getAbsorptionBadge = (rate: number | null) => {
  if (rate === null || rate === undefined) return { label: 'Sin dato', color: '#9ca3af' }
  if (rate >= 0.85) return { label: 'Bueno', color: '#10b981' }
  if (rate >= 0.70) return { label: 'Medio', color: '#f59e0b' }
  return { label: 'Bajo', color: '#ef4444' }
}

// Función para calcular opacidad del heatmap basado en absorción
const getHeatmapOpacity = (rate: number | null): number => {
  if (rate === null || rate === undefined) return 0.35
  if (rate >= 0.85) return 0.65  // Verde intenso
  if (rate >= 0.70) return 0.50  // Naranja medio
  return 0.35  // Rojo suave
}

// Función para obtener color de heatmap basado en absorción
const getHeatmapColor = (rate: number | null): string => {
  if (rate === null || rate === undefined) return '#9ca3af'  // Gris
  if (rate >= 0.85) return '#10b981'  // Verde
  if (rate >= 0.70) return '#f59e0b'  // Naranja
  return '#ef4444'  // Rojo
}

// Función para renderizar tooltip mejorado como HTML
const getTooltipHtml = (neighborhood: Neighborhood, propertyCount: number = 0): string => {
  const absorptionBadge = getAbsorptionBadge(neighborhood.absorption_rate)
  const absorptionPct = neighborhood.absorption_rate != null ? (neighborhood.absorption_rate * 100).toFixed(0) : '—'
  
  return `
    <div style="font-family: 'Segoe UI', sans-serif; min-width: 220px; padding: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 8px;">
        <strong style="font-size: 14px; color: #1f2937; flex: 1;">${neighborhood.name}</strong>
        <span style="background-color: ${absorptionBadge.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap;">${absorptionBadge.label}</span>
        ${propertyCount > 0 ? `<span style="background-color: #8fb2aa; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap;">🏠 ${propertyCount}</span>` : ''}
      </div>
      
      <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 10px; padding-bottom: 8px;">
        <span style="color: #666; font-size: 12px;">Zona ${neighborhood.zona_prc ?? '—'} · ${(neighborhood.tipo ?? '').replace(/_/g, ' ')}</span>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
        <div>
          <span style="color: #9ca3af; font-size: 11px;">UF/m²</span><br/>
          <strong style="color: #8fb2aa; font-size: 13px;">${neighborhood.price_per_sqm_uf?.toFixed(1) ?? '—'}</strong>
        </div>
        <div>
          <span style="color: #9ca3af; font-size: 11px;">Velocidad</span><br/>
          <strong style="color: #8fb2aa; font-size: 13px;">${neighborhood.velocity_days ?? '—'}d</strong>
        </div>
        <div>
          <span style="color: #9ca3af; font-size: 11px;">Absorción</span><br/>
          <strong style="color: #8fb2aa; font-size: 13px;">${absorptionPct}%</strong>
        </div>
        <div>
          <span style="color: #9ca3af; font-size: 11px;">Inventario</span><br/>
          <strong style="color: #8fb2aa; font-size: 13px;">${neighborhood.inventory_count ?? '—'}</strong>
        </div>
      </div>
    </div>
  `
}

// Inject global styles for Leaflet tooltips and animations
const injectTooltipStyles = () => {
  if (document.getElementById('leaflet-tooltip-styles')) return
  const style = document.createElement('style')
  style.id = 'leaflet-tooltip-styles'
  style.innerHTML = `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .leaflet-tooltip-custom {
      background: rgba(255, 255, 255, 0.98) !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
      padding: 0 !important;
      font-family: 'Segoe UI', sans-serif !important;
      backdrop-filter: blur(8px);
      animation: fadeInScale 200ms ease-out;
    }
    .leaflet-tooltip-custom::before {
      border-top-color: rgba(255, 255, 255, 0.98) !important;
    }
    .leaflet-tooltip-custom-right::before {
      border-right-color: rgba(255, 255, 255, 0.98) !important;
    }

    /* Smooth transitions for polygon fills */
    .leaflet-path {
      transition: fill-opacity 300ms ease, fill 300ms ease, stroke 300ms ease, stroke-width 300ms ease !important;
    }
  `
  document.head.appendChild(style)
}

export default function VitacuraMap({ neighborhoods, prcZones, properties, selected, onSelect, showPrc }: VitacuraMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const LRef         = useRef<any>(null)
  const layersRef    = useRef<any[]>([])
  const prcLayersRef = useRef<any[]>([])
  const propertyLayersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Inject tooltip styles on component mount
  useEffect(() => {
    injectTooltipStyles()
  }, [])

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
      const color           = TIPO_COLOR[n.tipo] || '#8fb2aa'
      const isSelected      = n.barrio_id === selected
      const heatmapOpacity  = getHeatmapOpacity(n.absorption_rate)
      const heatmapColor    = getHeatmapColor(n.absorption_rate)

      // Wrap raw geometry as a GeoJSON Feature so L.geoJSON handles it reliably
      const feature = { type: 'Feature', geometry: n.geometry, properties: {} }

      // Count properties in this neighborhood
      const propCount = properties.filter(p => p.barrio_id === n.barrio_id).length

      const layer = L.geoJSON(feature, {
        style: {
          color:       isSelected ? color : color + '60',
          weight:      isSelected ? 3.5 : 2.5,
          fillColor:   isSelected ? color : heatmapColor,
          fillOpacity: isSelected ? 0.8 : heatmapOpacity,
          dashArray:   'none',
          lineCap:     'round',
          lineJoin:    'round',
        },
      })
      .bindTooltip(getTooltipHtml(n, propCount), { 
        sticky: true,
        className: 'leaflet-tooltip-custom',
        offset: [0, 10]
      })
      .on('click', () => {
        onSelect(n.barrio_id === selected ? null : n.barrio_id)
        // Pulse effect on click with animated transition
        layer.setStyle({
          weight: isSelected ? 3 : 3.5,
          fillOpacity: 0.85,
          fillColor: color,
        })
        setTimeout(() => {
          layer.setStyle({
            weight: selected === n.barrio_id ? 3 : 2.5,
            fillOpacity: selected === n.barrio_id ? 0.75 : heatmapOpacity,
            fillColor: selected === n.barrio_id ? color : heatmapColor,
          })
        }, 250)
      })
      .on('mouseover', () => {
        // Smooth hover with animated opacity increase
        layer.setStyle({
          weight: isSelected ? 3 : 3,
          fillOpacity: isSelected ? 0.8 : Math.min(heatmapOpacity + 0.2, 0.85),
          color: color,
        })
        map.getContainer().style.cursor = 'pointer'
      })
      .on('mouseout', () => {
        // Smooth return to base state with animation
        layer.setStyle({
          weight: isSelected ? 3 : 2.5,
          fillOpacity: isSelected ? 0.75 : heatmapOpacity,
          fillColor: isSelected ? color : heatmapColor,
          color: isSelected ? color : '#d1d5db',
        })
        map.getContainer().style.cursor = 'grab'
      })
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
          weight:      2,
          fillColor:   '#7c3aed',
          fillOpacity: 0.12,
          dashArray:   '8 4',
          lineCap:     'round',
          lineJoin:    'round',
        },
      })
      .bindTooltip(`
        <div style="font-family: 'Segoe UI', sans-serif;">
          <strong style="color: #7c3aed; font-size: 12px;">${z.zona}</strong>${z.subzona ? `<span style="color: #999; font-size: 11px;"> / ${z.subzona}</span>` : ''}<br/>
          <span style="font-size:11px;color:#666;margin-top:4px;display:block;">${z.uso_suelo || 'Zona PRC'}</span>
        </div>
      `, { sticky: true, className: 'leaflet-tooltip-custom' })
      .on('mouseover', () => {
        layer.setStyle({
          weight: 2.5,
          fillOpacity: 0.20,
        })
      })
      .on('mouseout', () => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.12,
        })
      })
      .addTo(map)

      prcLayersRef.current.push(layer)
    })
  }, [mapReady, prcZones, showPrc])

  // ── Draw property markers ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const L   = LRef.current
    if (!map || !L) return

    propertyLayersRef.current.forEach(l => l.remove())
    propertyLayersRef.current = []

    if (!properties.length) return

    properties.forEach((p) => {
      if (!p.lat || !p.lng) return

      // Create custom property marker with beautiful styling
      const markerHtml = `
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8fb2aa 0%, #6b9e98 100%);
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 200ms ease;
          font-size: 16px;
          font-weight: bold;
          color: white;
        ">
          🏠
        </div>
      `

      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: 'property-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      })

      // Property tooltip with better styling
      const tooltipHtml = `
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 180px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 600; color: #1f2937;">🏠 Propiedad</span>
            <span style="background-color: #8fb2aa; color: white; padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: 600;">Disponible</span>
          </div>
          
          <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; padding-bottom: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
              <div>
                <span style="color: #9ca3af;">Precio</span><br/>
                <strong style="color: #8fb2aa; font-size: 12px;">${p.price_uf?.toFixed(0) ?? '—'} UF</strong>
              </div>
              <div>
                <span style="color: #9ca3af;">Área</span><br/>
                <strong style="color: #8fb2aa; font-size: 12px;">${p.area_m2?.toFixed(0) ?? '—'}m²</strong>
              </div>
              <div>
                <span style="color: #9ca3af;">Dormir</span><br/>
                <strong style="color: #8fb2aa; font-size: 12px;">${p.bedrooms ?? '—'}</strong>
              </div>
              <div>
                <span style="color: #9ca3af;">Baños</span><br/>
                <strong style="color: #8fb2aa; font-size: 12px;">${p.bathrooms ?? '—'}</strong>
              </div>
            </div>
          </div>
          
          <div style="font-size: 10px; color: #9ca3af;">
            Tiempo en mercado: <strong style="color: #555a56;">${p.days_on_market ?? '—'} días</strong>
          </div>
        </div>
      `

      marker.bindTooltip(tooltipHtml, {
        sticky: true,
        className: 'leaflet-tooltip-custom property-tooltip',
        offset: [0, 15],
      })

      marker.addTo(map)
      propertyLayersRef.current.push(marker)
    })
  }, [mapReady, properties])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '8px', zIndex: 0 }} />
      
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, right: 12, zIndex: 999,
        background: 'rgba(255, 255, 255, 0.96)', borderRadius: 10, padding: '14px 16px',
        fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'auto',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(229, 231, 235, 0.5)',
      }}>
        <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 12, color: '#1f2937' }}>Tipos de Zona</div>
        {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
          <div key={tipo} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            padding: '6px',
            borderRadius: 6,
            transition: 'background-color 0.2s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(143, 178, 170, 0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color,
              display: 'inline-block',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: `0 2px 4px ${color}33`
            }} />
            <span style={{ color: '#555', fontSize: 12 }}>{tipo.replace(/_/g, ' ')}</span>
          </div>
        ))}
        
        {showPrc && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 11, color: '#6b7280' }}>Overlay</div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px',
              borderRadius: 6,
            }}>
              <span style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: '#7c3aed',
                display: 'inline-block',
                opacity: 0.5,
                border: '2px dashed #7c3aed',
              }} />
              <span style={{ color: '#666', fontSize: 12 }}>Zona PRC</span>
            </div>
          </div>
        )}
      </div>

      {/* Status legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 12, zIndex: 999,
        background: 'rgba(255, 255, 255, 0.96)', borderRadius: 10, padding: '14px 16px',
        fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'auto',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(229, 231, 235, 0.5)',
      }}>
        <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 12, color: '#1f2937' }}>Absorción</div>
        {[
          { label: 'Bueno', color: '#10b981', range: '≥85%' },
          { label: 'Medio', color: '#f59e0b', range: '70-84%' },
          { label: 'Bajo', color: '#ef4444', range: '<70%' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            padding: '6px',
            borderRadius: 6,
          }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: item.color,
              display: 'inline-block',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1f2937' }}>{item.label}</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.range}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
