import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'
import { buildProspectTerritoryCoverage } from '@/lib/prospect-territory-coverage'

const ACTIVE = new Set(['new','assigned','contacting','qualified','valuation','proposal'])
const MAX_CANDIDATE_PROPERTIES = 500

function chunkIds<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

function hoursBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return (end - start) / 3_600_000
}

export async function GET() {
  let scope: Awaited<ReturnType<typeof requireAnyCapability>>
  try {
    scope = await requireAnyCapability(['properties.global.assign','properties.office.assign'])
  } catch (error) {
    return accessErrorResponse(error)
  }

  const db = createServiceClient()

  const [directorsResult, groupsResult, groupMembershipResult, groupOwnersResult] = await Promise.all([
    db.from('property_director_directory')
      .select('director_key,full_name,role,office_name,profile_id,source,source_effective_date')
      .eq('active', true)
      .order('office_name')
      .order('full_name'),
    db.from('property_territory_groups')
      .select('id,group_key,name,source,source_effective_date')
      .eq('active', true)
      .order('name'),
    db.from('property_territory_group_neighborhoods')
      .select('group_id,neighborhood_id,valid_from,source')
      .eq('active', true)
      .is('valid_to', null)
      .limit(200),
    db.from('property_territory_group_director_assignments')
      .select('group_id,director_key,assignment_role,valid_from,source')
      .eq('active', true)
      .is('valid_to', null)
      .eq('assignment_role', 'primary')
      .limit(50),
  ])

  if (directorsResult.error || groupsResult.error || groupMembershipResult.error || groupOwnersResult.error) {
    return NextResponse.json({ error: 'No fue posible cargar el modelo territorial.' }, { status: 500 })
  }

  const directors = directorsResult.data ?? []
  const allGroups = groupsResult.data ?? []
  const visibleGroups = allGroups.filter((group) => scope.scope === 'global' || !scope.team || group.name === scope.team)
  const visibleGroupIds = new Set(visibleGroups.map((group) => group.id))
  const visibleDirectors = directors.filter((item) => scope.scope === 'global' || !scope.team || item.office_name === scope.team)
  const directorKeys = visibleDirectors.map((item) => item.director_key)

  if (!visibleGroups.length || !directorKeys.length) {
    return NextResponse.json({
      directors: visibleDirectors,
      territoryGroups: visibleGroups,
      permissions: { canBulkAssign: scope.scope === 'global' },
      leads: [],
      candidates: [],
      performance: [],
      territoryCoverage: [],
      territorySummary: {
        neighborhoods: 0,
        mappedNeighborhoods: 0,
        unmappedNeighborhoods: 0,
        coveragePct: null,
        eligiblePublished: 0,
        uncoveredPublished: 0,
        directorDriftLeads: 0,
        candidateUniverseTruncated: false,
        candidateUniverseCount: 0,
      },
      summary: { leads:0,active:0,overdue:0,valuations:0,won:0 },
      generatedAt: new Date().toISOString(),
    })
  }

  const groupById = new Map(allGroups.map((group) => [group.id, group]))
  const primaryOwnerByGroup = new Map(
    (groupOwnersResult.data ?? []).map((row) => [row.group_id, row]),
  )

  const territories = (groupMembershipResult.data ?? [])
    .filter((membership) => visibleGroupIds.has(membership.group_id))
    .map((membership) => {
      const group = groupById.get(membership.group_id)
      const owner = primaryOwnerByGroup.get(membership.group_id)
      if (!group || !owner) return null
      return {
        neighborhood_id: membership.neighborhood_id,
        group_key: group.group_key,
        group_name: group.name,
        director_key: owner.director_key,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  const [leadResult, neighborhoodsResult] = await Promise.all([
    db.from('property_prospect_leads')
      .select('id,property_id,neighborhood_id,director_key,status,priority,source_listing_id,source_url,lead_reason,detected_at,assigned_at,first_contact_at,last_follow_up_at,next_follow_up_at,won_at,lost_at,lost_reason,latest_note,updated_at')
      .in('director_key', directorKeys)
      .order('updated_at', { ascending: false })
      .limit(500),
    db.from('market_neighborhoods')
      .select('id,name,micro_neighborhood,assignment_status')
      .order('name')
      .limit(100),
  ])

  if (leadResult.error || neighborhoodsResult.error) {
    return NextResponse.json({ error: 'No fue posible cargar la operación de prospección.' }, { status: 500 })
  }

  const leads = leadResult.data ?? []
  const propertyIds = [...new Set(leads.map((item) => item.property_id))]

  const [propertiesResult, valuationsResult] = await Promise.all([
    propertyIds.length
      ? db.from('market_properties').select('id,normalized_address,property_type,neighborhood_id,identity_status,last_seen_at').in('id', propertyIds)
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length
      ? db.from('valuation_cases').select('id,subject_property_id,status,estimated_value_uf,valuation_date,created_at,issued_at').in('subject_property_id', propertyIds).order('created_at', { ascending:false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (propertiesResult.error || valuationsResult.error) {
    return NextResponse.json({ error: 'No fue posible completar el pipeline de prospección.' }, { status: 500 })
  }

  const propertyById = new Map((propertiesResult.data ?? []).map((item) => [item.id,item]))
  const neighborhoodById = new Map((neighborhoodsResult.data ?? []).map((item) => [item.id,item]))
  const directorByKey = new Map(directors.map((item) => [item.director_key,item]))
  const territoryByNeighborhood = new Map(territories.map((item) => [item.neighborhood_id,item]))
  const valuationsByProperty = new Map<string, any[]>()

  for (const valuation of valuationsResult.data ?? []) {
    const list = valuationsByProperty.get(valuation.subject_property_id) ?? []
    list.push(valuation)
    valuationsByProperty.set(valuation.subject_property_id, list)
  }

  const now = Date.now()
  const enrichedLeads = leads.map((lead) => {
    const valuationRows = valuationsByProperty.get(lead.property_id) ?? []
    const territory = territoryByNeighborhood.get(lead.neighborhood_id) ?? null
    return {
      ...lead,
      property: propertyById.get(lead.property_id) ?? null,
      neighborhood: neighborhoodById.get(lead.neighborhood_id) ?? null,
      territory,
      director: directorByKey.get(lead.director_key) ?? null,
      valuationCount: valuationRows.length,
      latestValuation: valuationRows[0] ?? null,
      overdue: Boolean(lead.next_follow_up_at && ACTIVE.has(lead.status) && new Date(lead.next_follow_up_at).getTime() < now),
    }
  })

  const performance = visibleDirectors.map((director) => {
    const rows = enrichedLeads.filter((lead) => lead.director_key === director.director_key)
    const firstContactHours = rows.map((lead) => hoursBetween(lead.assigned_at, lead.first_contact_at)).filter((value): value is number => value != null)
    const wonCycleHours = rows.map((lead) => hoursBetween(lead.assigned_at, lead.won_at)).filter((value): value is number => value != null)
    const won = rows.filter((lead) => lead.status === 'won').length
    const valuationLeads = rows.filter((lead) => lead.valuationCount > 0).length
    return {
      director,
      leads: rows.length,
      active: rows.filter((lead) => ACTIVE.has(lead.status)).length,
      qualified: rows.filter((lead) => ['qualified','valuation','proposal','won'].includes(lead.status)).length,
      valuationLeads,
      won,
      lost: rows.filter((lead) => lead.status === 'lost').length,
      overdue: rows.filter((lead) => lead.overdue).length,
      conversionPct: rows.length ? Number((won / rows.length * 100).toFixed(1)) : null,
      valuationRatePct: rows.length ? Number((valuationLeads / rows.length * 100).toFixed(1)) : null,
      avgFirstContactHours: firstContactHours.length ? Number((firstContactHours.reduce((a,b)=>a+b,0)/firstContactHours.length).toFixed(1)) : null,
      avgWonCycleDays: wonCycleHours.length ? Number((wonCycleHours.reduce((a,b)=>a+b,0)/wonCycleHours.length/24).toFixed(1)) : null,
    }
  })

  const candidatePropertiesResult = await db.from('market_properties')
    .select('id,normalized_address,property_type,neighborhood_id,identity_status,last_seen_at', { count: 'exact' })
    .eq('property_type', 'Casa')
    .not('neighborhood_id', 'is', null)
    .order('last_seen_at', { ascending: false })
    .limit(MAX_CANDIDATE_PROPERTIES)

  if (candidatePropertiesResult.error) {
    return NextResponse.json({ error:'No fue posible resolver las casas publicadas.' },{status:500})
  }

  const candidateProperties = candidatePropertiesResult.data ?? []
  const candidatePropertyIds = candidateProperties.map((item) => item.id)
  const candidateListingRows: any[] = []

  for (const ids of chunkIds(candidatePropertyIds, 50)) {
    const listingChunk = await db.from('market_current_listings')
      .select('property_id,source_listing_id,url,status,operation,observed_at,published_at,price_uf')
      .in('property_id', ids)
      .in('status',['active','observed'])
      .order('observed_at',{ascending:false})
    if (listingChunk.error) {
      return NextResponse.json({ error: 'No fue posible cargar publicaciones candidatas.' }, { status:500 })
    }
    candidateListingRows.push(...(listingChunk.data ?? []))
  }

  const leadPropertySet = new Set(propertyIds)
  const listingByProperty = new Map<string, any>()

  for(const listing of candidateListingRows) {
    const operation = String(listing.operation ?? '').toLowerCase()
    if (!['sale','venta','sell'].includes(operation)) continue
    if(!listingByProperty.has(listing.property_id)) listingByProperty.set(listing.property_id,listing)
  }

  const eligibleProperties = candidateProperties.filter((property) => listingByProperty.has(property.id))
  const territoryCoverage = buildProspectTerritoryCoverage({
    eligibleProperties,
    leads,
    territories,
    neighborhoods: neighborhoodsResult.data ?? [],
    directors,
  })

  const visibleCoverageRows = territoryCoverage.rows

  const visibleCoverageSummary = {
    neighborhoods: visibleCoverageRows.length,
    mappedNeighborhoods: visibleCoverageRows.filter((row) => !row.needsGroup).length,
    unmappedNeighborhoods: visibleCoverageRows.filter((row) => row.needsGroup).length,
    coveragePct: visibleCoverageRows.length
      ? Number((visibleCoverageRows.filter((row) => !row.needsGroup).length / visibleCoverageRows.length * 100).toFixed(1))
      : null,
    eligiblePublished: visibleCoverageRows.reduce((sum, row) => sum + row.eligiblePublished, 0),
    uncoveredPublished: visibleCoverageRows.filter((row) => row.needsGroup).reduce((sum, row) => sum + row.eligiblePublished, 0),
    directorDriftLeads: visibleCoverageRows.reduce((sum, row) => sum + row.directorDriftLeads, 0),
    candidateUniverseTruncated: (candidatePropertiesResult.count ?? 0) > candidateProperties.length,
    candidateUniverseCount: candidatePropertiesResult.count ?? candidateProperties.length,
  }

  const candidates = eligibleProperties
    .map((property)=>{
      const id=property.id
      if(!property.neighborhood_id || leadPropertySet.has(id)) return null
      const territory=territoryByNeighborhood.get(property.neighborhood_id) ?? null
      const listing=listingByProperty.get(id)
      if(!listing) return null
      if(scope.scope !== 'global' && !territory) return null
      return {
        property,
        neighborhood: neighborhoodById.get(property.neighborhood_id) ?? null,
        territory,
        director: territory ? directorByKey.get(territory.director_key) ?? null : null,
        listing,
        needsGroup: !territory,
      }
    })
    .filter(Boolean)
    .slice(0,100)

  return NextResponse.json({
    directors: visibleDirectors,
    territoryGroups: visibleGroups,
    permissions: { canBulkAssign: scope.scope === 'global' },
    leads: enrichedLeads,
    candidates,
    performance,
    territoryCoverage: visibleCoverageRows,
    territorySummary: visibleCoverageSummary,
    summary: {
      leads: enrichedLeads.length,
      active: enrichedLeads.filter((lead)=>ACTIVE.has(lead.status)).length,
      overdue: enrichedLeads.filter((lead)=>lead.overdue).length,
      valuations: enrichedLeads.filter((lead)=>lead.valuationCount>0).length,
      won: enrichedLeads.filter((lead)=>lead.status==='won').length,
    },
    generatedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control':'no-store' } })
}
