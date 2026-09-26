import { OperationalState } from '@/components/ui/operational-state'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import LeafletNeighborhoodsMap, { type MapFeature, type MapGeometry, type MapProperty } from '@/components/market/leaflet-neighborhoods-map'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { getVitacuraNeighborhoodSnapshot } from '@/lib/vitacura-neighborhoods'

type GeometryRow = {
  barrio_id: string
  barrio_nombre: string
  geometry: unknown
}

type ListingRow = {
  id: string
  property_id: string | null
  normalized_address: string | null
  latitude: number | string | null
  longitude: number | string | null
  price_uf: number | string | null
  price_uf_m2: number | string | null
  observed_at: string | null
  url: string | null
  market_sources: { code: string | null } | Array<{ code: string | null }> | null
  market_properties: {
    id: string
    property_type: string | null
    normalized_address: string | null
    latitude: number | string | null
    longitude: number | string | null
    useful_area_m2: number | string | null
    bedrooms: number | null
    bathrooms: number | null
    market_neighborhoods: { name: string | null; micro_neighborhood: string | null } | Array<{ name: string | null; micro_neighborhood: string | null }> | null
  } | Array<{
    id: string
    property_type: string | null
    normalized_address: string | null
    latitude: number | string | null
    longitude: number | string | null
    useful_area_m2: number | string | null
    bedrooms: number | null
    bathrooms: number | null
    market_neighborhoods: { name: string | null; micro_neighborhood: string | null } | Array<{ name: string | null; micro_neighborhood: string | null }> | null
  }> | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function numeric(value: number | string | null | undefined) {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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
  await requireAnyPageCapability(['market.read'])

  const supabase = await createClient()
  const [geometryResult, listingResult, snapshot] = await Promise.all([
    supabase
      .from('vitacura_market_neighborhoods')
      .select('barrio_id,barrio_nombre,geometry')
      .eq('fuente', 'Property Partners')
      .eq('version', '2026-08-12'),
    supabase
      .from('market_current_listings')
      .select('id,property_id,normalized_address,latitude,longitude,price_uf,price_uf_m2,observed_at,url,market_sources!inner(code),market_properties!inner(id,property_type,normalized_address,latitude,longitude,useful_area_m2,bedrooms,bathrooms,market_neighborhoods(name,micro_neighborhood))')
      .in('status', ['active', 'observed'])
      .eq('market_properties.property_type', 'Casa')
      .order('observed_at', { ascending: false })
      .limit(500),
    getVitacuraNeighborhoodSnapshot(),
  ])

  if (geometryResult.error) {
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Pilar 02 · Mercado" title="Mapa de propiedades" meta="Vitacura · Casas" />
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
      <WorkspaceHeader eyebrow="Pilar 02 · Mercado" title="Mapa de propiedades" meta="Vitacura · Casas" />
      <div className="mt-5">
        <OperationalState kind="empty" title="Sin geometría territorial" description="No hay polígonos de barrios importados para el KML canónico vigente." />
      </div>
    </WorkspaceShell>
  }

  const properties: MapProperty[] = ((listingResult.data ?? []) as ListingRow[]).flatMap((listing) => {
    const property = one(listing.market_properties)
    const source = one(listing.market_sources)
    if (!property || !source?.code) return []

    const lat = numeric(listing.latitude) ?? numeric(property.latitude)
    const lng = numeric(listing.longitude) ?? numeric(property.longitude)
    if (lat == null || lng == null) return []

    const neighborhood = one(property.market_neighborhoods)
    const sourceCode = source.code
    const live = sourceCode === 'portal-inmobiliario-vitacura-portal-houses'

    return [{
      id: listing.id,
      propertyId: property.id || listing.property_id || listing.id,
      address: listing.normalized_address || property.normalized_address || 'Dirección no disponible',
      lat,
      lng,
      priceUf: numeric(listing.price_uf),
      priceUfM2: numeric(listing.price_uf_m2),
      areaM2: numeric(property.useful_area_m2),
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      neighborhood: neighborhood?.micro_neighborhood || neighborhood?.name || null,
      observedAt: listing.observed_at,
      sourceCode,
      url: listing.url,
      evidence: live ? 'live' : 'historical',
    } satisfies MapProperty]
  })

  const totalProperties = features.reduce((total, feature) => total + feature.properties, 0)
  const liveMapProperties = properties.filter((property) => property.evidence === 'live').length
  const historicalMapProperties = properties.length - liveMapProperties
  const sourceDate = snapshot.importedAt ? new Date(snapshot.importedAt).toLocaleDateString('es-CL') : null
  const sourceLabel = snapshot.sourceFile
    ? `Territorio: ${snapshot.sourceFile}${sourceDate ? ` · importado el ${sourceDate}` : ''}`
    : 'Territorio: KML canónico de barrios de Vitacura'

  return (
    <WorkspaceShell contentClassName="max-w-[1480px]">
      <WorkspaceHeader
        eyebrow="Pilar 02 · Mercado"
        title="Mapa de propiedades"
        meta="Vitacura · Casas · territorio PP + oferta georreferenciada"
        actions={[
          { label: 'Oferta', href: '/dashboard/market/oferta' },
          { label: 'Volver a Mercado', href: '/dashboard/market' },
        ]}
      />

      {snapshot.error || listingResult.error ? (
        <div className="mt-5 border border-[#f0c96a] p-3 text-xs text-[#f0c96a]">
          Parte de la evidencia no pudo cargarse. El mapa mantiene la geometría disponible y no interpreta faltantes como cero.
        </div>
      ) : null}

      <div className="mt-5 grid gap-px border-y border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Barrios canónicos', features.length.toLocaleString('es-CL')],
          ['Oferta live en mapa', liveMapProperties.toLocaleString('es-CL')],
          ['Evidencia histórica geocodificada', historicalMapProperties.toLocaleString('es-CL')],
          ['Casas PP con territorio', totalProperties.toLocaleString('es-CL')],
        ].map(([label, value]) => (
          <div key={label} className="bg-[var(--n3-black)] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-4 min-w-0">
        <LeafletNeighborhoodsMap features={features} properties={properties} sourceLabel={sourceLabel} />
      </section>
    </WorkspaceShell>
  )
}
