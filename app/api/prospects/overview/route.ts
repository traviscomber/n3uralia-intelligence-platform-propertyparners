import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'
import { buildProspectTerritoryCoverage } from '@/lib/prospect-territory-coverage'

const ACTIVE = new Set(['new','assigned','contacting','qualified','valuation','proposal'])

function chunkIds<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

function normalizePerson(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function samePerson(left: string, right: string) {
  const a = normalizePerson(left).split(' ').filter(Boolean)
  const b = normalizePerson(right).split(' ').filter(Boolean)
  if (!a.length || !b.length) return false
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1]
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
  const { data: directors, error: directorsError } = await db
    .from('property_director_directory')
    .select('director_key,full_name,role,office_name,profile_id,source,source_effective_date')
    .eq('active', true)
    .order('office_name')
    .order('full_name')

  if (directorsError) return NextResponse.json({ error: 'No fue posible cargar el directorio territorial.' }, { status: 500 })

  const visibleDirectors = (directors ?? []).filter((item) => scope.scope === 'global' || !scope.team || item.office_name === scope.team)
  const directorKeys = visibleDirectors.map((item) => item.director_key)
  if (!directorKeys.length) return NextResponse.json({
    directors: [],
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

  const [leadResult, territoryResult] = await Promise.all([
    db.from('property_prospect_leads')
      .select('id,property_id,neighborhood_id,director_key,status,priority,source_listing_id,source_url,lead_reason,detected_at,assigned_at,first_contact_at,last_follow_up_at,next_follow_up_at,won_at,lost_at,lost_reason,latest_note,updated_at')
      .in('director_key', directorKeys)
      .order('updated_at', { ascending: false })
      .limit(500),
    db.from('market_neighborhood_director_assignments')
      .select('id,neighborhood_id,director_key,valid_from,assignment_reason,source')
      .in('director_key', directorKeys)
      .eq('active', true)
      .is('valid_to', null)
      .limit(200),
  ])

  if (leadResult.error || territoryResult.error) return NextResponse.json({ error: 'No fue posible cargar la operación de prospección.' }, { status: 500 })

  const leads = leadResult.data ?? []
  const propertyIds = [...new Set(leads.map((item) => item.property_id))]
  const neighborhoodIds = [...new Set([...(territoryResult.data ?? []).map((item) => item.neighborhood_id), ...leads.map((item) => item.neighborhood_id)])]

  const [propertiesResult, neighborhoodsResult, valuationsResult] = await Promise.all([
    propertyIds.length
      ? db.from('market_properties').select('id,normalized_address,property_type,neighborhood_id,identity_status,last_seen_at').in('id', propertyIds)
      : Promise.resolve({ data: [], error: null }),
    db.from('market_neighborhoods').select('id,name,micro_neighborhood,assignment_status').order('name').limit(100),
    propertyIds.length
      ? db.from('valuation_cases').select('id,subject_property_id,status,estimated_value_uf,valuation_date,created_at,issued_at').in('subject_property_id', propertyIds).order('created_at', { ascending:false })
      : Promise.resolve({ data: [], error: null }),
  ])
  if (propertiesResult.error || neighborhoodsResult.error || valuationsResult.error) return NextResponse.json({ error: 'No fue posible completar el pipeline de prospección.' }, { status: 500 })

  const propertyById = new Map((propertiesResult.data ?? []).map((item) => [item.id,item]))
  const neighborhoodById = new Map((neighborhoodsResult.data ?? []).map((item) => [item.id,item]))
  const directorByKey = new Map(visibleDirectors.map((item) => [item.director_key,item]))
  const valuationsByProperty = new Map<string, any[]>()
  for (const valuation of valuationsResult.data ?? []) {
    const list = valuationsByProperty.get(valuation.subject_property_id) ?? []
    list.push(valuation)
    valuationsByProperty.set(valuation.subject_property_id, list)
  }

  const now = Date.now()
  const enrichedLeads = leads.map((lead) => {
    const valuationRows = valuationsByProperty.get(lead.property_id) ?? []
    return {
      ...lead,
      property: propertyById.get(lead.property_id) ?? null,
      neighborhood: neighborhoodById.get(lead.neighborhood_id) ?? null,
      director: directorByKey.get(lead.director_key) ?? null,
      valuationCount: valuationRows.length,
      latestValuation: valuationRows[0] ?? null,
      overdue: Boolean(lead.next_follow_up_at && ACTIVE.has(lead.status) && new Date(lead.next_follow_up_at).getTime() < now),
    }
  })

  const [kmlTerritoriesResult, sellerOfficeEvidenceResult] = await Promise.all([
    db.from('vitacura_market_neighborhoods')
      .select('barrio_nombre,raw_properties')
      .eq('fuente','Property Partners')
      .eq('version','2026-08-12'),
    db.from('management_source_records')
      .select('seller_name,office_name')
      .not('seller_name','is',null)
      .not('office_name','is',null)
      .limit(500),
  ])
  if (kmlTerritoriesResult.error || sellerOfficeEvidenceResult.error) {
    return NextResponse.json({ error:'No fue posible cargar la evidencia territorial.' },{status:500})
  }

  const neighborhoodIdByName = new Map(
    (neighborhoodsResult.data ?? []).map((item) => [normalizePerson(item.micro_neighborhood || item.name), item.id]),
  )
  const territorySuggestionByNeighborhood = new Map<string, {
    directorKey: string | null
    directorName: string | null
    officeName: string | null
    confidence: 'high' | 'medium' | 'unresolved'
    reason: string
    evidence: Record<string, unknown>
  }>()

  for (const row of kmlTerritoriesResult.data ?? []) {
    const neighborhoodId = neighborhoodIdByName.get(normalizePerson(row.barrio_nombre))
    if (!neighborhoodId) continue
    const raw = row.raw_properties && typeof row.raw_properties === 'object' ? row.raw_properties as Record<string, unknown> : null
    const partners = Array.isArray(raw?.partners) ? raw?.partners.filter((item): item is string => typeof item === 'string') : []

    const exactDirector = visibleDirectors.find((director) => partners.some((partner) => samePerson(partner,director.full_name)))
    if (exactDirector) {
      territorySuggestionByNeighborhood.set(neighborhoodId,{
        directorKey: exactDirector.director_key,
        directorName: exactDirector.full_name,
        officeName: exactDirector.office_name,
        confidence:'high',
        reason:'El KML contractual del barrio nombra directamente a una persona del directorio canónico.',
        evidence:{source:'Barrios Vitacura.kml',partners,method:'exact-kml-partner-director'},
      })
      continue
    }

    const officeVotes = new Map<string,number>()
    let totalVotes = 0
    for (const evidence of sellerOfficeEvidenceResult.data ?? []) {
      if (!evidence.seller_name || !evidence.office_name) continue
      if (!partners.some((partner) => samePerson(partner,evidence.seller_name))) continue
      officeVotes.set(evidence.office_name,(officeVotes.get(evidence.office_name) ?? 0)+1)
      totalVotes += 1
    }
    const ranked = [...officeVotes.entries()].sort((a,b)=>b[1]-a[1])
    const top = ranked[0]
    if (!top || !totalVotes) {
      territorySuggestionByNeighborhood.set(neighborhoodId,{
        directorKey:null,directorName:null,officeName:null,confidence:'unresolved',
        reason:'El KML define partners, pero no existe evidencia suficiente para resolver oficina/director sin inferir.',
        evidence:{source:'Barrios Vitacura.kml',partners,method:'no-office-evidence'},
      })
      continue
    }

    const share = top[1] / totalVotes
    const officeDirectors = visibleDirectors.filter((director)=>director.office_name===top[0])
    if (share >= 0.75 && officeDirectors.length === 1) {
      const director = officeDirectors[0]
      territorySuggestionByNeighborhood.set(neighborhoodId,{
        directorKey:director.director_key,directorName:director.full_name,officeName:top[0],confidence:'medium',
        reason:'La evidencia operacional concentra al menos 75% de las apariciones de los partners KML en una oficina con un único director canónico.',
        evidence:{source:'Barrios Vitacura.kml + management_source_records',partners,officeVotes:Object.fromEntries(ranked),share,method:'office-evidence-unique-director'},
      })
    } else {
      territorySuggestionByNeighborhood.set(neighborhoodId,{
        directorKey:null,directorName:null,officeName:top[0],confidence:'unresolved',
        reason:officeDirectors.length > 1
          ? 'La oficina sugerida tiene más de un director canónico; requiere confirmación humana.'
          : 'La evidencia de oficina no alcanza el umbral de 75%; requiere confirmación humana.',
        evidence:{source:'Barrios Vitacura.kml + management_source_records',partners,officeVotes:Object.fromEntries(ranked),share,method:'office-evidence-unresolved'},
      })
    }
  }

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

  const { data: portalSource, error: portalSourceError } = await db
    .from('market_sources')
    .select('id')
    .eq('code', 'portal-inmobiliario-vitacura-portal-houses')
    .maybeSingle()
  if (portalSourceError || !portalSource?.id) {
    return NextResponse.json({ error:'No fue posible resolver la fuente live de Portal.' },{status:500})
  }

  const candidateListingsResult = await db.from('market_current_listings')
    .select('property_id,source_listing_id,url,status,operation,observed_at,published_at,price_uf')
    .eq('source_id', portalSource.id)
    .not('property_id', 'is', null)
    .in('status',['active','observed'])
    .order('observed_at',{ascending:false})
    .limit(2000)
  if (candidateListingsResult.error) return NextResponse.json({ error:'No fue posible cargar el inventario live vinculado.' },{status:500})

  const candidateListingRows = candidateListingsResult.data ?? []
  const candidatePropertyIds = [...new Set(candidateListingRows.map((item) => item.property_id).filter(Boolean))]
  const candidatePropertiesResult = candidatePropertyIds.length
    ? await db.from('market_properties')
        .select('id,normalized_address,property_type,neighborhood_id,identity_status,last_seen_at')
        .in('id', candidatePropertyIds)
        .eq('property_type', 'Casa')
        .not('neighborhood_id', 'is', null)
    : { data: [], error: null }
  if (candidatePropertiesResult.error) return NextResponse.json({ error:'No fue posible resolver las casas publicadas.' },{status:500})

  const candidateProperties = candidatePropertiesResult.data ?? []

  const leadPropertySet = new Set(propertyIds)
  const territoryByNeighborhood = new Map((territoryResult.data ?? []).map((item)=>[item.neighborhood_id,item]))
  const candidatePropertyById = new Map(candidateProperties.map((item)=>[item.id,item]))
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
    territories: territoryResult.data ?? [],
    neighborhoods: neighborhoodsResult.data ?? [],
    directors: visibleDirectors,
  })
  const coverageRowsWithSuggestions = territoryCoverage.rows.map((row)=>({
    ...row,
    suggestion: territorySuggestionByNeighborhood.get(row.neighborhood.id) ?? null,
  }))
  const visibleCoverageRows = scope.scope === 'global'
    ? coverageRowsWithSuggestions
    : coverageRowsWithSuggestions.filter((row) => row.territory && directorKeys.includes(row.territory.director_key))

  const visibleCoverageSummary = {
    neighborhoods: visibleCoverageRows.length,
    mappedNeighborhoods: visibleCoverageRows.filter((row) => !row.needsDirector).length,
    unmappedNeighborhoods: visibleCoverageRows.filter((row) => row.needsDirector).length,
    coveragePct: visibleCoverageRows.length
      ? Number((visibleCoverageRows.filter((row) => !row.needsDirector).length / visibleCoverageRows.length * 100).toFixed(1))
      : null,
    eligiblePublished: visibleCoverageRows.reduce((sum, row) => sum + row.eligiblePublished, 0),
    uncoveredPublished: visibleCoverageRows.filter((row) => row.needsDirector).reduce((sum, row) => sum + row.eligiblePublished, 0),
    directorDriftLeads: visibleCoverageRows.reduce((sum, row) => sum + row.directorDriftLeads, 0),
    candidateUniverseTruncated: false,
    candidateUniverseCount: candidatePropertyIds.length,
  }

  const candidates = eligibleProperties
    .map((property)=>{
      const id=property.id
      if(!property.neighborhood_id || leadPropertySet.has(id)) return null
      const territory=territoryByNeighborhood.get(property.neighborhood_id) ?? null
      const listing=listingByProperty.get(id)
      if(!listing) return null
      if(scope.scope !== 'global' && (!territory || !directorKeys.includes(territory.director_key))) return null
      return {
        property,
        neighborhood: neighborhoodById.get(property.neighborhood_id) ?? null,
        director: territory ? directorByKey.get(territory.director_key) ?? null : null,
        territory,
        listing,
        needsDirector: !territory,
        suggestion: property.neighborhood_id ? territorySuggestionByNeighborhood.get(property.neighborhood_id) ?? null : null,
      }
    })
    .filter(Boolean)
    .slice(0,100)

  return NextResponse.json({
    directors: visibleDirectors,
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
