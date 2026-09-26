import { OperationalState } from '@/components/ui/operational-state'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import LeafletOfferMap, { type OfferMapItem } from '@/components/market/leaflet-offer-map'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'

const MAX_LISTINGS = 500
const QUERY_CHUNK_SIZE = 100

function numeric(value: unknown) {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default async function MarketOfferMapPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read', 'management.office.read'])

  const db = createServiceClient()
  const { data: listings, error: listingError, count } = await db
    .from('market_current_listings')
    .select('property_id,source_listing_id,title,raw_address,normalized_address,latitude,longitude,price_uf,price_uf_m2,published_at,observed_at,url,status,operation', { count: 'exact' })
    .in('status', ['active', 'observed'])
    .eq('operation', 'Venta')
    .not('property_id', 'is', null)
    .order('observed_at', { ascending: false })
    .limit(MAX_LISTINGS)

  if (listingError) {
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Mercado · Inteligencia PP" title="Oferta en mapa" meta="Vitacura" actions={[
        { label: 'Territorio', href: '/dashboard/market/mapa' },
        { label: 'Volver a Mercado', href: '/dashboard/market' },
      ]} />
      <div className="mt-5"><OperationalState kind="error" title="No fue posible cargar la oferta" description="La consulta del inventario vigente falló." /></div>
    </WorkspaceShell>
  }

  const propertyIds = [...new Set((listings ?? []).map((row) => String(row.property_id)).filter(Boolean))]
  const properties: any[] = []
  for (let index = 0; index < propertyIds.length; index += QUERY_CHUNK_SIZE) {
    const ids = propertyIds.slice(index, index + QUERY_CHUNK_SIZE)
    const { data, error } = await db
      .from('market_properties')
      .select('id,normalized_address,latitude,longitude,neighborhood_id,built_area_m2,land_area_m2,bedrooms,bathrooms,identity_status,first_seen_at,last_seen_at')
      .in('id', ids)
    if (error) {
      return <WorkspaceShell>
        <WorkspaceHeader eyebrow="Mercado · Inteligencia PP" title="Oferta en mapa" meta="Vitacura" actions={[
          { label: 'Territorio', href: '/dashboard/market/mapa' },
          { label: 'Volver a Mercado', href: '/dashboard/market' },
        ]} />
        <div className="mt-5"><OperationalState kind="error" title="No fue posible resolver las propiedades" description="El inventario existe, pero no se pudo cargar su identidad canónica." /></div>
      </WorkspaceShell>
    }
    properties.push(...(data ?? []))
  }

  const neighborhoodIds = [...new Set(properties.map((row) => row.neighborhood_id).filter(Boolean))]
  const { data: neighborhoods, error: neighborhoodError } = neighborhoodIds.length
    ? await db.from('market_neighborhoods').select('id,name').in('id', neighborhoodIds)
    : { data: [], error: null }

  if (neighborhoodError) {
    return <WorkspaceShell>
      <WorkspaceHeader eyebrow="Mercado · Inteligencia PP" title="Oferta en mapa" meta="Vitacura" actions={[
        { label: 'Territorio', href: '/dashboard/market/mapa' },
        { label: 'Volver a Mercado', href: '/dashboard/market' },
      ]} />
      <div className="mt-5"><OperationalState kind="error" title="No fue posible resolver los barrios" description="La oferta está disponible, pero faltó la referencia territorial." /></div>
    </WorkspaceShell>
  }

  const leads: any[] = []
  const valuations: any[] = []
  const assignments: any[] = []
  for (let index = 0; index < propertyIds.length; index += QUERY_CHUNK_SIZE) {
    const ids = propertyIds.slice(index, index + QUERY_CHUNK_SIZE)
    const [leadResult, valuationResult, assignmentResult] = await Promise.all([
      db.from('property_prospect_leads')
        .select('id,property_id,status,priority,director_key,next_follow_up_at,updated_at')
        .in('property_id', ids)
        .order('updated_at', { ascending: false }),
      db.from('valuation_cases')
        .select('id,subject_property_id,status,confidence,estimated_value_uf,updated_at')
        .in('subject_property_id', ids)
        .order('updated_at', { ascending: false }),
      db.from('property_assignments')
        .select('id,property_id,assignment_role,status,assigned_at')
        .in('property_id', ids)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false }),
    ])
    if (leadResult.error || valuationResult.error || assignmentResult.error) {
      return <WorkspaceShell>
        <WorkspaceHeader eyebrow="Mercado · Inteligencia PP" title="Oferta en mapa" meta="Vitacura" actions={[
          { label: 'Territorio', href: '/dashboard/market/mapa' },
          { label: 'Volver a Mercado', href: '/dashboard/market' },
        ]} />
        <div className="mt-5"><OperationalState kind="error" title="No fue posible cargar la inteligencia PP" description="La oferta está disponible, pero faltó parte de la trazabilidad operacional." /></div>
      </WorkspaceShell>
    }
    leads.push(...(leadResult.data ?? []))
    valuations.push(...(valuationResult.data ?? []))
    assignments.push(...(assignmentResult.data ?? []))
  }

  const territoryAssignments: any[] = []
  if (neighborhoodIds.length) {
    for (let index = 0; index < neighborhoodIds.length; index += QUERY_CHUNK_SIZE) {
      const ids = neighborhoodIds.slice(index, index + QUERY_CHUNK_SIZE)
      const { data, error } = await db.from('market_neighborhood_director_assignments')
        .select('neighborhood_id,director_key')
        .in('neighborhood_id', ids)
        .eq('active', true)
        .is('valid_to', null)
      if (error) {
        return <WorkspaceShell>
          <WorkspaceHeader eyebrow="Mercado · Inteligencia PP" title="Oferta en mapa" meta="Vitacura" actions={[
            { label: 'Territorio', href: '/dashboard/market/mapa' },
            { label: 'Volver a Mercado', href: '/dashboard/market' },
          ]} />
          <div className="mt-5"><OperationalState kind="error" title="No fue posible cargar los responsables territoriales" description="La oferta está disponible, pero faltó la asignación territorial vigente." /></div>
        </WorkspaceShell>
      }
      territoryAssignments.push(...(data ?? []))
    }
  }

  const directorKeys = [...new Set(territoryAssignments.map((row) => row.director_key).filter(Boolean))]
  const { data: directors } = directorKeys.length
    ? await db.from('property_director_directory').select('director_key,full_name,office_name').in('director_key', directorKeys).eq('active', true)
    : { data: [] }

  const propertyById = new Map(properties.map((row) => [String(row.id), row]))
  const neighborhoodById = new Map((neighborhoods ?? []).map((row) => [String(row.id), String(row.name)]))
  const leadByProperty = new Map<string, any>()
  for (const row of leads) if (!leadByProperty.has(String(row.property_id))) leadByProperty.set(String(row.property_id), row)
  const valuationByProperty = new Map<string, any>()
  for (const row of valuations) if (!valuationByProperty.has(String(row.subject_property_id))) valuationByProperty.set(String(row.subject_property_id), row)
  const assignmentByProperty = new Map<string, any>()
  for (const row of assignments) if (!assignmentByProperty.has(String(row.property_id))) assignmentByProperty.set(String(row.property_id), row)
  const territoryByNeighborhood = new Map(territoryAssignments.map((row) => [String(row.neighborhood_id), row]))
  const directorByKey = new Map((directors ?? []).map((row) => [String(row.director_key), row]))
  const seen = new Set<string>()

  const items: OfferMapItem[] = []
  for (const listing of listings ?? []) {
    const propertyId = String(listing.property_id)
    if (!propertyId || seen.has(propertyId)) continue
    seen.add(propertyId)
    const property = propertyById.get(propertyId)
    if (!property) continue

    const latitude = numeric(property.latitude) ?? numeric(listing.latitude)
    const longitude = numeric(property.longitude) ?? numeric(listing.longitude)
    if (latitude == null || longitude == null) continue

    const firstSeenAt = property.first_seen_at ? String(property.first_seen_at) : null
    const observedAt = listing.observed_at ? String(listing.observed_at) : null
    const daysPublished = firstSeenAt && observedAt
      ? Math.max(0, Math.floor((new Date(observedAt).getTime() - new Date(firstSeenAt).getTime()) / 86400000))
      : null
    const lead = leadByProperty.get(propertyId) ?? null
    const valuation = valuationByProperty.get(propertyId) ?? null
    const assignment = assignmentByProperty.get(propertyId) ?? null
    const territory = property.neighborhood_id ? territoryByNeighborhood.get(String(property.neighborhood_id)) ?? null : null
    const director = territory?.director_key ? directorByKey.get(String(territory.director_key)) ?? null : null

    items.push({
      propertyId,
      sourceListingId: String(listing.source_listing_id ?? ''),
      title: listing.title ? String(listing.title) : null,
      address: property.normalized_address ? String(property.normalized_address) : listing.normalized_address ? String(listing.normalized_address) : listing.raw_address ? String(listing.raw_address) : null,
      neighborhood: property.neighborhood_id ? neighborhoodById.get(String(property.neighborhood_id)) ?? null : null,
      latitude,
      longitude,
      priceUf: numeric(listing.price_uf),
      priceUfM2: numeric(listing.price_uf_m2),
      builtAreaM2: numeric(property.built_area_m2),
      landAreaM2: numeric(property.land_area_m2),
      bedrooms: property.bedrooms == null ? null : Number(property.bedrooms),
      bathrooms: property.bathrooms == null ? null : Number(property.bathrooms),
      daysPublished,
      identityStatus: property.identity_status ? String(property.identity_status) : null,
      observedAt,
      sourceUrl: listing.url ? String(listing.url) : null,
      lead: lead ? {
        id: String(lead.id),
        status: String(lead.status),
        priority: String(lead.priority ?? 'normal'),
        nextFollowUpAt: lead.next_follow_up_at ? String(lead.next_follow_up_at) : null,
      } : null,
      valuation: valuation ? {
        id: String(valuation.id),
        status: String(valuation.status),
        confidence: valuation.confidence ? String(valuation.confidence) : null,
        estimatedValueUf: numeric(valuation.estimated_value_uf),
      } : null,
      hasActiveAssignment: Boolean(assignment),
      territoryDirector: director ? {
        key: String(director.director_key),
        name: String(director.full_name),
        office: director.office_name ? String(director.office_name) : null,
      } : null,
    })
  }

  const totalCurrent = count ?? (listings ?? []).length

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Mercado · Inteligencia PP"
      title="Oferta en mapa"
      meta="Vitacura · oferta vigente + trazabilidad operacional"
      actions={[
        { label: 'Territorio', href: '/dashboard/market/mapa', primary: true },
        { label: 'Lista de oferta', href: '/dashboard/market/oferta' },
        { label: 'Volver a Mercado', href: '/dashboard/market' },
      ]}
    />

    <section className="mt-5 border-y border-[var(--n3-line)] py-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div><span className="text-[var(--n3-text-muted)]">Universo vigente</span> <strong className="ml-2 tabular-nums">{totalCurrent.toLocaleString('es-CL')}</strong></div>
        <div><span className="text-[var(--n3-text-muted)]">Muestra cargada</span> <strong className="ml-2 tabular-nums">{Math.min(totalCurrent, MAX_LISTINGS).toLocaleString('es-CL')}</strong></div>
        <div><span className="text-[var(--n3-text-muted)]">Georreferenciadas</span> <strong className="ml-2 tabular-nums">{items.length.toLocaleString('es-CL')}</strong></div>
        <div><span className="text-[var(--n3-text-muted)]">Fuente</span> <strong className="ml-2">Portal Inmobiliario · identidad PP</strong></div>
      </div>
      {totalCurrent > MAX_LISTINGS ? <p className="mt-2 text-[11px] text-[var(--n3-text-muted)]">El mapa trabaja con las {MAX_LISTINGS.toLocaleString('es-CL')} publicaciones vigentes más recientes; el universo completo se mantiene informado por separado.</p> : null}
    </section>

    {items.length ? (
      <section className="mt-4 min-w-0">
        <LeafletOfferMap items={items} />
      </section>
    ) : (
      <div className="mt-5"><OperationalState kind="empty" title="Sin propiedades georreferenciadas" description="La oferta vigente existe, pero no hay coordenadas suficientes para esta vista." /></div>
    )}
  </WorkspaceShell>
}
