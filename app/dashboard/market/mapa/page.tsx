import { OperationalState } from '@/components/ui/operational-state'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import LeafletNeighborhoodsMap, { type MapFeature, type MapGeometry } from '@/components/market/leaflet-neighborhoods-map'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { getVitacuraNeighborhoodSnapshot } from '@/lib/vitacura-neighborhoods'

type GeometryRow = {
  barrio_id: string
  barrio_nombre: string
  geometry: unknown
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizeGeometry(value: unknown): MapGeometry | null {
  let parsed = value
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) as unknown } catch { return null }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  const geometry = record.type === 'Feature' && record.geometry && typeof record.geometry === 'object'
    ? record.geometry as Record<string, unknown>
    : record
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null
  if (!Array.isArray(geometry.coordinates)) return null
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates as number[][][] }
  }
  return { type: 'MultiPolygon', coordinates: geometry.coordinates as number[][][][] }
}

export default async function VitacuraMapPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read'])

  const supabase = await createClient()
  const [geometryResult, snapshot] = await Promise.all([
    supabase
      .from('vitacura_market_neighborhoods')
      .select('barrio_id,barrio_nombre,geometry')
      .eq('fuente', 'Property Partners')
      .eq('version', '2026-08-12'),
    getVitacuraNeighborhoodSnapshot(),
  ])

  if (geometryResult.error) {
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Mercado · Territorio" title="Mapa de barrios" meta="Lectura" />
      <div className="mt-5">
        <OperationalState kind="error" title="No fue posible cargar el mapa" description="La consulta de la geometría territorial falló. Reintenta más tarde." />
      </div>
    </WorkspaceShell>
  }

  const statsByName = new Map(
    snapshot.neighborhoods.map((row) => [normalizeName(row.name), row]),
  )

  const features: MapFeature[] = (geometryResult.data ?? [])
    .map((row: GeometryRow) => {
      const geometry = normalizeGeometry(row.geometry)
      if (!geometry) return null
      const stats = statsByName.get(normalizeName(row.barrio_nombre))
      return {
        id: row.barrio_id,
        name: stats?.name ?? row.barrio_nombre,
        properties: stats?.properties ?? 0,
        partners: stats?.partners ?? [],
        geometry,
      }
    })
    .filter((feature): feature is MapFeature => feature !== null)
    .sort((a, b) => b.properties - a.properties || a.name.localeCompare(b.name, 'es'))

  if (features.length === 0) {
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Mercado · Territorio" title="Mapa de barrios" meta="Lectura" />
      <div className="mt-5">
        <OperationalState kind="empty" title="Sin geometría territorial" description="No hay polígonos de barrios importados para el KML canónico vigente." />
      </div>
    </WorkspaceShell>
  }

  const totalProperties = features.reduce((total, feature) => total + feature.properties, 0)
  const sourceDate = snapshot.importedAt ? new Date(snapshot.importedAt).toLocaleDateString('es-CL') : null
  const sourceLabel = snapshot.sourceFile
    ? `Fuente: ${snapshot.sourceFile}${sourceDate ? ` · importado el ${sourceDate}` : ''}`
    : 'Fuente: KML canónico de barrios de Vitacura'

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Territorio"
        title="Mapa de barrios de Vitacura"
        meta="Sólo lectura"
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {snapshot.error ? (
        <div className="mt-5 border border-[#f0c96a] p-3 text-xs text-[#f0c96a]">
          No fue posible cargar los conteos de casas; el mapa muestra sólo la geometría.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-[var(--n3-line)] py-3 text-xs">
        <div><span className="text-[var(--n3-text-muted)]">Barrios</span> <strong className="ml-2 tabular-nums text-[var(--n3-text-light)]">{features.length}</strong></div>
        <div><span className="text-[var(--n3-text-muted)]">Casas asignadas</span> <strong className="ml-2 tabular-nums text-[var(--n3-text-light)]">{totalProperties.toLocaleString('es-CL')}</strong></div>
        <div className="min-w-0"><span className="text-[var(--n3-text-muted)]">Fuente</span> <strong className="ml-2 font-medium text-[var(--n3-text-light)]">{snapshot.sourceFile ?? 'KML canónico'}</strong>{sourceDate ? <span className="ml-2 text-[var(--n3-text-muted)]">· {sourceDate}</span> : null}</div>
      </div>

      <section className="mt-4 min-w-0">
        <LeafletNeighborhoodsMap features={features} sourceLabel={sourceLabel} />
      </section>
    </WorkspaceShell>
  )
}
