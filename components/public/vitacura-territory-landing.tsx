'use client'

import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { PublicTerritoryFeature, PublicTerritoryGeometry } from '@/lib/vitacura-public-territory'

const VIEW_W = 920
const VIEW_H = 650
const PAD = 34

function ringsOf(geometry: PublicTerritoryGeometry): number[][][] {
  return geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.coordinates.flatMap((polygon) => polygon.slice(0, 1))
}

function projector(features: PublicTerritoryFeature[]) {
  const points: Array<[number, number]> = []
  for (const feature of features) {
    for (const ring of ringsOf(feature.geometry)) {
      for (const [lng, lat] of ring) points.push([lng, lat])
    }
  }
  if (!points.length) return null

  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const midLat = (minLat + maxLat) / 2
  const kx = Math.cos((midLat * Math.PI) / 180)
  const spanX = (maxLng - minLng) * kx || 1
  const spanY = maxLat - minLat || 1
  const scale = Math.min((VIEW_W - PAD * 2) / spanX, (VIEW_H - PAD * 2) / spanY)
  const offsetX = (VIEW_W - spanX * scale) / 2
  const offsetY = (VIEW_H - spanY * scale) / 2

  return ([lng, lat]: number[]): [number, number] => [
    offsetX + (lng - minLng) * kx * scale,
    VIEW_H - (offsetY + (lat - minLat) * scale),
  ]
}

function ringPath(ring: number[][], project: (point: number[]) => [number, number]) {
  return ring.map((point, index) => {
    const [x, y] = project(point)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + ' Z'
}

export default function VitacuraTerritoryLanding({ features }: { features: PublicTerritoryFeature[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(features[0]?.id ?? null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const project = useMemo(() => projector(features), [features])
  const selected = features.find((feature) => feature.id === selectedId) ?? null

  if (!project) return null

  return (
    <div className="relative min-h-[520px] overflow-hidden border border-white/10 bg-[#080b0a] sm:min-h-[620px]">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_42%,rgba(215,51,43,0.15),transparent_38%)]" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.035]" />
        <div className="absolute bottom-0 left-1/2 top-0 w-px bg-white/[0.035]" />
      </div>

      <div className="absolute left-4 top-4 z-10 border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm sm:left-6 sm:top-6">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">KML canónico</p>
        <p className="mt-1 text-xs text-white/70">Vitacura · {features.length} barrios</p>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Territorio KML de Vitacura"
        className="absolute inset-0 h-full w-full p-4 sm:p-8"
      >
        {features.map((feature) => {
          const active = feature.id === selectedId
          const hovered = feature.id === hoveredId
          const d = ringsOf(feature.geometry).map((ring) => ringPath(ring, project)).join(' ')

          return (
            <path
              key={feature.id}
              d={d}
              fill="#d7332b"
              fillOpacity={active ? 0.58 : hovered ? 0.34 : 0.11}
              stroke={active || hovered ? '#ff8b85' : 'rgba(237,244,243,0.24)'}
              strokeWidth={active ? 2.2 : hovered ? 1.6 : 0.9}
              className="cursor-pointer outline-none transition-[fill-opacity,stroke,stroke-width] duration-200 focus-visible:stroke-white"
              tabIndex={0}
              role="button"
              aria-label={`Seleccionar barrio ${feature.name}`}
              onMouseEnter={() => setHoveredId(feature.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(feature.id)}
              onBlur={() => setHoveredId(null)}
              onClick={() => setSelectedId(feature.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedId(feature.id)
                }
              }}
            >
              <title>{feature.name}</title>
            </path>
          )
        })}
      </svg>

      <div className="absolute bottom-4 left-4 right-4 z-10 border border-white/10 bg-black/78 p-4 backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-auto sm:w-[320px]">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#ff766f]" aria-hidden="true" />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Territorio seleccionado</p>
            <p className="mt-1 text-xl font-medium text-white">{selected?.name ?? 'Vitacura'}</p>
            <p className="mt-2 text-xs leading-5 text-white/52">Geometría territorial Property Partners. La información operacional permanece dentro del portal autenticado.</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 hidden max-w-[330px] grid-cols-2 gap-x-3 gap-y-1.5 lg:grid">
        {features.map((feature, index) => {
          const active = feature.id === selectedId
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => setSelectedId(feature.id)}
              className={`min-h-8 border-l px-2 text-left text-[10px] transition-colors ${active ? 'border-[#ff766f] text-white' : 'border-white/10 text-white/42 hover:border-white/30 hover:text-white/75'}`}
            >
              <span className="mr-1 tabular-nums opacity-55">{String(index + 1).padStart(2, '0')}</span>
              {feature.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
