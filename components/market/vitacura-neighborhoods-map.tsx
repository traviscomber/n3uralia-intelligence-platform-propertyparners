'use client'

import { useMemo, useState } from 'react'
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

const VIEW_W = 800
const VIEW_H = 640
const PAD = 24

function ringsOf(geometry: MapGeometry): number[][][] {
  return geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.coordinates.flatMap((polygon) => polygon.slice(0, 1))
}

function project(features: MapFeature[]) {
  const points: Array<[number, number]> = []
  for (const feature of features) {
    for (const ring of ringsOf(feature.geometry)) {
      for (const [lng, lat] of ring) points.push([lng, lat])
    }
  }
  if (points.length === 0) return null

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

function ringPath(ring: number[][], toXY: (p: number[]) => [number, number]) {
  return ring
    .map((point, index) => {
      const [x, y] = toXY(point)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ') + ' Z'
}

function fillOpacity(properties: number, max: number) {
  if (max <= 0) return 0.18
  return 0.18 + 0.5 * (properties / max)
}

export default function VitacuraNeighborhoodsMap({ features, sourceLabel }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const toXY = useMemo(() => project(features), [features])
  const maxProperties = useMemo(() => Math.max(0, ...features.map((f) => f.properties)), [features])
  const selected = features.find((feature) => feature.id === selectedId) ?? null

  if (!toXY) {
    return <p className="border border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No hay geometría disponible para dibujar el mapa.</p>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-2">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="Mapa de barrios de Vitacura" className="h-auto w-full">
          {features.map((feature) => {
            const d = ringsOf(feature.geometry).map((ring) => ringPath(ring, toXY)).join(' ')
            const isSelected = feature.id === selectedId
            return (
              <path
                key={feature.id}
                d={d}
                fill="var(--n3-teal)"
                fillOpacity={fillOpacity(feature.properties, maxProperties)}
                stroke={isSelected ? '#ffffff' : 'var(--n3-line)'}
                strokeWidth={isSelected ? 2 : 0.8}
                className="cursor-pointer transition-opacity"
                onClick={() => setSelectedId(isSelected ? null : feature.id)}
              >
                <title>{`${feature.name} — ${feature.properties} casa${feature.properties === 1 ? '' : 's'}`}</title>
              </path>
            )
          })}
        </svg>
        <p className="mt-2 px-2 pb-1 text-[10px] text-[var(--n3-text-muted)]">{sourceLabel}</p>
      </div>

      <aside className="border border-[var(--n3-line)] p-4">
        {selected ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Barrio</p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--n3-text-light)]">{selected.name}</h3>
            <p className="mt-3 text-sm text-[var(--n3-text-light)]">
              {selected.properties.toLocaleString('es-CL')} casa{selected.properties === 1 ? '' : 's'} asignada{selected.properties === 1 ? '' : 's'}
            </p>
            {selected.partners.length ? (
              <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
                Ejecutivos: {selected.partners.join(' · ')}
              </p>
            ) : null}
            <Link href="/dashboard/market/revisar-barrios" className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[var(--primary)] px-3 text-xs font-semibold text-[var(--n3-text-light)]">
              Revisar territorio <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Mapa territorial</p>
            <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
              Haz clic en un barrio para ver su nombre, casas asignadas y ejecutivos. El color es más intenso donde hay más casas.
            </p>
            <p className="mt-3 text-xs text-[var(--n3-text-muted)]">{features.length} barrios</p>
          </div>
        )}
      </aside>
    </div>
  )
}
