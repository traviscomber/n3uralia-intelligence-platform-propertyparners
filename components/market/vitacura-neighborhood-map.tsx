'use client'

import { useMemo, useState } from 'react'
import type { VitacuraNeighborhoodCoverageRow } from '@/lib/vitacura-neighborhoods'

type Point = [number, number]

type Props = {
  neighborhoods: VitacuraNeighborhoodCoverageRow[]
}

function collectPoints(rows: VitacuraNeighborhoodCoverageRow[]): Point[] {
  const points: Point[] = []
  for (const row of rows) {
    for (const polygon of row.geometry?.coordinates ?? []) {
      for (const ring of polygon) {
        for (const point of ring) {
          if (Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
            points.push([point[0], point[1]])
          }
        }
      }
    }
  }
  return points
}

export function VitacuraNeighborhoodMap({ neighborhoods }: Props) {
  const mapped = neighborhoods.filter((row) => row.geometry)
  const [selectedName, setSelectedName] = useState(mapped[0]?.name ?? '')
  const selected = mapped.find((row) => row.name === selectedName) ?? mapped[0] ?? null

  const projection = useMemo(() => {
    const width = 960
    const height = 520
    const padding = 28
    const points = collectPoints(mapped)
    if (!points.length) return null

    const lngs = points.map(([lng]) => lng)
    const lats = points.map(([, lat]) => lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const spanLng = Math.max(maxLng - minLng, 0.000001)
    const spanLat = Math.max(maxLat - minLat, 0.000001)
    const availableWidth = width - padding * 2
    const availableHeight = height - padding * 2
    const scale = Math.min(availableWidth / spanLng, availableHeight / spanLat)
    const drawWidth = spanLng * scale
    const drawHeight = spanLat * scale
    const offsetX = (width - drawWidth) / 2
    const offsetY = (height - drawHeight) / 2

    const project = ([lng, lat]: Point) => [
      offsetX + (lng - minLng) * scale,
      offsetY + (maxLat - lat) * scale,
    ] as const

    const pathFor = (row: VitacuraNeighborhoodCoverageRow) => {
      const segments: string[] = []
      for (const polygon of row.geometry?.coordinates ?? []) {
        for (const ring of polygon) {
          if (!ring.length) continue
          const [firstX, firstY] = project([ring[0][0], ring[0][1]])
          let path = `M ${firstX.toFixed(2)} ${firstY.toFixed(2)}`
          for (const point of ring.slice(1)) {
            const [x, y] = project([point[0], point[1]])
            path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
          }
          segments.push(`${path} Z`)
        }
      }
      return segments.join(' ')
    }

    return { width, height, pathFor }
  }, [mapped])

  if (!projection || !mapped.length) {
    return <div className="py-6 text-sm text-[var(--n3-text-muted)]">La geometría territorial no está disponible.</div>
  }

  return (
    <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.65fr)]">
      <div className="overflow-hidden border-y border-[var(--n3-line)] bg-white/[0.012]">
        <svg
          viewBox={`0 0 ${projection.width} ${projection.height}`}
          role="img"
          aria-label="Mapa de barrios de Vitacura definidos por Property Partners"
          className="block h-auto w-full"
        >
          <rect width={projection.width} height={projection.height} fill="transparent" />
          {mapped.map((row) => {
            const active = row.name === selected?.name
            return (
              <path
                key={row.name}
                d={projection.pathFor(row)}
                fill={active ? 'var(--n3-accent)' : 'rgba(255,255,255,0.045)'}
                fillOpacity={active ? 0.35 : 1}
                stroke={active ? 'var(--n3-accent)' : 'rgba(255,255,255,0.22)'}
                strokeWidth={active ? 2.4 : 1.2}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-opacity hover:opacity-80"
                tabIndex={0}
                role="button"
                aria-label={`${row.name}: ${row.properties} propiedades`}
                onClick={() => setSelectedName(row.name)}
                onFocus={() => setSelectedName(row.name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedName(row.name)
                  }
                }}
              >
                <title>{`${row.name} · ${row.properties} propiedades`}</title>
              </path>
            )
          })}
        </svg>
      </div>

      <div>
        {selected ? (
          <div className="border-y border-[var(--n3-line)] py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Zona seleccionada</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{selected.name}</h3>
            <p className="mt-1 text-sm tabular-nums text-[var(--n3-text-muted)]">{selected.properties.toLocaleString('es-CL')} propiedades clasificadas</p>
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Partners territoriales</p>
              <p className="mt-1 text-sm leading-6 text-[var(--n3-text-light)]">
                {selected.partners.length ? selected.partners.join(' · ') : 'Sin partner asignado en la fuente'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 max-h-[330px] overflow-y-auto border-y border-[var(--n3-line)]">
          {mapped.map((row) => (
            <button
              key={row.name}
              type="button"
              onClick={() => setSelectedName(row.name)}
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--n3-line)] px-1 py-2.5 text-left last:border-b-0 ${row.name === selected?.name ? 'bg-white/[0.045]' : 'hover:bg-white/[0.025]'}`}
            >
              <span className="truncate text-sm text-[var(--n3-text-light)]">{row.name}</span>
              <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{row.properties}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
