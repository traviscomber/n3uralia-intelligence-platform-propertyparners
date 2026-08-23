'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type GeoJSONSourceSpecification,
  type LngLatBoundsLike,
  type StyleSpecification,
} from 'maplibre-gl'
import type { VitacuraNeighborhoodCoverageRow } from '@/lib/vitacura-neighborhoods'
import styles from './vitacura-neighborhood-map.module.css'

const SOURCE_ID = 'property-partners-neighborhoods'
const FILL_LAYER_ID = 'property-partners-neighborhoods-fill'
const LINE_LAYER_ID = 'property-partners-neighborhoods-line'

const baseStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#050807' },
    },
    {
      id: 'carto',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-opacity': 0.72,
        'raster-saturation': -0.35,
        'raster-contrast': 0.12,
      },
    },
  ],
}

function geometryBounds(geometry: VitacuraNeighborhoodCoverageRow['geometry']): LngLatBoundsLike | null {
  if (!geometry) return null

  let minLng = Number.POSITIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY

  function visit(value: unknown) {
    if (
      Array.isArray(value)
      && value.length >= 2
      && typeof value[0] === 'number'
      && Number.isFinite(value[0])
      && typeof value[1] === 'number'
      && Number.isFinite(value[1])
    ) {
      minLng = Math.min(minLng, value[0])
      minLat = Math.min(minLat, value[1])
      maxLng = Math.max(maxLng, value[0])
      maxLat = Math.max(maxLat, value[1])
      return
    }

    if (Array.isArray(value)) value.forEach(visit)
  }

  visit(geometry.coordinates)
  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return null

  return [[minLng, minLat], [maxLng, maxLat]]
}

function combinedBounds(neighborhoods: VitacuraNeighborhoodCoverageRow[]): LngLatBoundsLike | null {
  const bounds = neighborhoods
    .map((row) => geometryBounds(row.geometry))
    .filter((value): value is [[number, number], [number, number]] => Boolean(value))

  if (!bounds.length) return null

  return [
    [
      Math.min(...bounds.map((value) => value[0][0])),
      Math.min(...bounds.map((value) => value[0][1])),
    ],
    [
      Math.max(...bounds.map((value) => value[1][0])),
      Math.max(...bounds.map((value) => value[1][1])),
    ],
  ]
}

const numberFormatter = new Intl.NumberFormat('es-CL')

export function VitacuraNeighborhoodMap({
  neighborhoods,
}: {
  neighborhoods: VitacuraNeighborhoodCoverageRow[]
}) {
  const mappedNeighborhoods = useMemo(
    () => neighborhoods.filter((row) => row.geometry),
    [neighborhoods],
  )
  const mapNodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(mappedNeighborhoods[0]?.id ?? null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const selected = mappedNeighborhoods.find((row) => row.id === selectedId) ?? mappedNeighborhoods[0] ?? null

  useEffect(() => {
    if (!mapNodeRef.current || !mappedNeighborhoods.length) return

    const featureCollection = {
      type: 'FeatureCollection' as const,
      features: mappedNeighborhoods.map((row) => ({
        type: 'Feature' as const,
        id: row.id,
        properties: {
          name: row.name,
          properties: row.properties,
        },
        geometry: row.geometry,
      })),
    }

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: baseStyle,
      center: [-70.559, -33.382],
      zoom: 12.2,
      minZoom: 10,
      maxZoom: 18,
      attributionControl: false,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: featureCollection as GeoJSONSourceSpecification['data'],
      })

      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'properties']],
            0, '#321312',
            10, '#70201c',
            25, '#a82a24',
            50, '#d7332b',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.7,
            0.4,
          ],
        },
      })

      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ffffff',
            '#ff766f',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2.4,
            1.1,
          ],
          'line-opacity': 0.95,
        },
      })

      const bounds = combinedBounds(mappedNeighborhoods)
      if (bounds) map.fitBounds(bounds, { padding: 46, duration: 0 })
      setReady(true)
    })

    map.on('mouseenter', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('click', FILL_LAYER_ID, (event) => {
      const id = event.features?.[0]?.id
      if (typeof id === 'string' || typeof id === 'number') setSelectedId(String(id))
    })
    map.on('error', (event) => {
      if (!map.isStyleLoaded() && event.error) setFailed(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mappedNeighborhoods])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    mappedNeighborhoods.forEach((row) => {
      map.setFeatureState(
        { source: SOURCE_ID, id: row.id },
        { selected: row.id === selectedId },
      )
    })
  }, [mappedNeighborhoods, ready, selectedId])

  function selectNeighborhood(row: VitacuraNeighborhoodCoverageRow) {
    setSelectedId(row.id)
    const bounds = geometryBounds(row.geometry)
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 64, duration: 550, maxZoom: 15 })
  }

  if (!mappedNeighborhoods.length) {
    return <div className={styles.error}>Sin polígonos disponibles.</div>
  }

  return (
    <div className={styles.shell}>
      <div className={styles.mapWrap}>
        <div ref={mapNodeRef} className={styles.map} aria-label="Mapa de barrios de Vitacura" />
        {!ready && !failed ? <div className={styles.loading}>Cargando mapa</div> : null}
        {failed ? <div className={styles.error}>No fue posible mostrar el mapa.</div> : null}
      </div>

      <aside className={styles.panel} aria-label="Barrios Property Partners">
        <div className={styles.selected}>
          <p className={styles.micro}>Barrio</p>
          <p className={styles.selectedName}>{selected?.name ?? '—'}</p>
          <p className={styles.selectedMeta}>{numberFormatter.format(selected?.properties ?? 0)} propiedades exactas</p>
          <p className={styles.selectedPartners}>{selected?.partners.length ? selected.partners.join(' · ') : 'Sin partner'}</p>
        </div>

        <div className={styles.list}>
          {mappedNeighborhoods.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`${styles.row} ${row.id === selected?.id ? styles.rowActive : ''}`}
              aria-pressed={row.id === selected?.id}
              onClick={() => selectNeighborhood(row)}
            >
              <span className={styles.rowName}>{row.name}</span>
              <span className={styles.rowCount}>{numberFormatter.format(row.properties)}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
