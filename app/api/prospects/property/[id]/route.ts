import { NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability, requireAnyCapability } from '@/lib/access-guards'
import { hasCapability } from '@/lib/access-control'
import { createServiceClient } from '@/lib/supabase/service'

const OPEN_LISTING_STATUSES = new Set(['active', 'observed'])
const LEAD_STATUSES = new Set(['new','assigned','contacting','qualified','valuation','proposal','won','lost','archived'])
const PRIORITIES = new Set(['low','normal','high'])

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function canManage(scope: Awaited<ReturnType<typeof requireCapability>>) {
  return hasCapability(scope.role, 'properties.global.assign') || hasCapability(scope.role, 'properties.office.assign')
}

async function loadProperty(db: ReturnType<typeof createServiceClient>, id: string) {
  const { data, error } = await db
    .from('market_properties')
    .select('id,normalized_address,property_type,neighborhood_id,identity_status,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('PROPERTY_LOAD_FAILED')
  return data
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let scope: Awaited<ReturnType<typeof requireCapability>>
  try {
    scope = await requireCapability('market.read')
  } catch (error) {
    return accessErrorResponse(error)
  }

  const db = createServiceClient()
  const { id } = await context.params
  const property = await loadProperty(db, id)
  if (!property) return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 })

  const [neighborhoodResult, directorsResult, territoryResult, leadResult, listingResult] = await Promise.all([
    property.neighborhood_id
      ? db.from('market_neighborhoods').select('id,name,micro_neighborhood,assignment_status').eq('id', property.neighborhood_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from('property_director_directory').select('director_key,full_name,role,office_name,profile_id,source,source_effective_date').eq('active', true).order('office_name').order('full_name'),
    property.neighborhood_id
      ? db.from('market_neighborhood_director_assignments').select('id,neighborhood_id,director_key,valid_from,assignment_reason,source,created_at').eq('neighborhood_id', property.neighborhood_id).eq('active', true).is('valid_to', null).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from('property_prospect_leads').select('*').eq('property_id', property.id).maybeSingle(),
    db.from('market_current_listings').select('source_listing_id,url,status,operation,observed_at,published_at,price_uf').eq('property_id', property.id).order('observed_at', { ascending: false }).limit(10),
  ])

  const failure = [neighborhoodResult.error, directorsResult.error, territoryResult.error, leadResult.error, listingResult.error].find(Boolean)
  if (failure) return NextResponse.json({ error: 'No fue posible cargar la gestión comercial de la propiedad.' }, { status: 500 })

  const lead = leadResult.data ?? null
  const eventsResult = lead
    ? await db.from('property_prospect_events').select('id,event_type,actor_id,from_status,to_status,note,metadata,occurred_at').eq('lead_id', lead.id).order('occurred_at', { ascending: false }).limit(50)
    : { data: [], error: null }
  if (eventsResult.error) return NextResponse.json({ error: 'No fue posible cargar la trazabilidad del lead.' }, { status: 500 })

  const territory = territoryResult.data ?? null
  const directorByKey = new Map((directorsResult.data ?? []).map((item) => [item.director_key, item]))
  const territoryDirector = territory ? directorByKey.get(territory.director_key) ?? null : null
  const leadDirector = lead ? directorByKey.get(lead.director_key) ?? null : null
  const currentListing = (listingResult.data ?? []).find((item) => OPEN_LISTING_STATUSES.has(String(item.status))) ?? listingResult.data?.[0] ?? null
  const publishedLeadEligible = Boolean(
    property.neighborhood_id
    && currentListing
    && OPEN_LISTING_STATUSES.has(String(currentListing.status))
    && ['sale','venta','sell'].includes(String(currentListing.operation ?? '').toLowerCase())
  )

  const visibleDirectors = (directorsResult.data ?? []).filter((director) =>
    scope.scope === 'global' || !scope.team || director.office_name === scope.team
  )

  return NextResponse.json({
    property: {
      id: property.id,
      address: property.normalized_address,
      propertyType: property.property_type,
      neighborhoodId: property.neighborhood_id,
      identityStatus: property.identity_status,
    },
    neighborhood: neighborhoodResult.data ?? null,
    currentListing,
    publishedLeadEligible,
    permissions: {
      canManage: canManage(scope),
      canCreateValuation: hasCapability(scope.role, 'valuations.self.create')
        || hasCapability(scope.role, 'valuations.office.review')
        || hasCapability(scope.role, 'valuations.global.approve'),
    },
    directors: visibleDirectors,
    territoryAssignment: territory ? { ...territory, director: territoryDirector } : null,
    lead: lead ? { ...lead, director: leadDirector } : null,
    events: eventsResult.data ?? [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let scope: Awaited<ReturnType<typeof requireAnyCapability>>
  try {
    scope = await requireAnyCapability(['properties.global.assign', 'properties.office.assign'])
  } catch (error) {
    return accessErrorResponse(error)
  }

  const db = createServiceClient()
  const { id } = await context.params
  const property = await loadProperty(db, id)
  if (!property) return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 })
  if (!property.neighborhood_id) return NextResponse.json({ error: 'La propiedad no tiene barrio canónico asignado.' }, { status: 409 })

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }) }

  const action = text(body.action)

  if (action === 'assign_director') {
    const directorKey = text(body.directorKey)
    if (!directorKey) return NextResponse.json({ error: 'Selecciona director/a.' }, { status: 400 })

    const { data: director, error: directorError } = await db
      .from('property_director_directory')
      .select('director_key,full_name,role,office_name,active')
      .eq('director_key', directorKey)
      .eq('active', true)
      .maybeSingle()
    if (directorError || !director) return NextResponse.json({ error: 'Director/a no disponible.' }, { status: 400 })
    if (scope.scope !== 'global' && scope.team && director.office_name !== scope.team) {
      return NextResponse.json({ error: 'La dirección seleccionada está fuera del alcance de oficina.' }, { status: 403 })
    }

    const { data: assignmentResult, error: assignmentError } = await db.rpc(
      'assign_property_neighborhood_director_v1',
      {
        p_neighborhood_id: property.neighborhood_id,
        p_director_key: directorKey,
        p_actor_id: scope.profileId,
        p_reason: text(body.reason) || null,
        p_source: 'property-360',
      },
    )

    if (assignmentError) {
      console.error('PROPERTY_TERRITORY_ASSIGNMENT_FAILED', {
        code: assignmentError.code,
        neighborhoodId: property.neighborhood_id,
      })
      return NextResponse.json({ error: 'No fue posible actualizar el director territorial de forma atómica.' }, { status: 422 })
    }

    return NextResponse.json({ ok: true, assignment: assignmentResult })
  }

  if (action === 'create_lead') {
    const { data: territory } = await db
      .from('market_neighborhood_director_assignments')
      .select('director_key')
      .eq('neighborhood_id', property.neighborhood_id)
      .eq('active', true)
      .is('valid_to', null)
      .maybeSingle()
    if (!territory) return NextResponse.json({ error: 'Asigna primero un director/a al barrio.' }, { status: 409 })

    const { data: listing } = await db
      .from('market_current_listings')
      .select('source_listing_id,url,status,operation,observed_at')
      .eq('property_id', property.id)
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!listing || !OPEN_LISTING_STATUSES.has(String(listing.status))) {
      return NextResponse.json({ error: 'La propiedad no tiene una publicación activa/observada elegible.' }, { status: 409 })
    }

    const { data: existing } = await db.from('property_prospect_leads').select('id').eq('property_id', property.id).maybeSingle()
    if (existing) return NextResponse.json({ ok: true, leadId: existing.id, existing: true })

    const { data: lead, error: leadError } = await db.from('property_prospect_leads').insert({
      property_id: property.id,
      neighborhood_id: property.neighborhood_id,
      director_key: territory.director_key,
      source_listing_id: listing.source_listing_id,
      source_url: listing.url,
      lead_reason: text(body.reason) || 'Propiedad publicada seleccionada como oportunidad Property Partners.',
      status: 'assigned',
      priority: PRIORITIES.has(text(body.priority)) ? text(body.priority) : 'normal',
      created_by: scope.profileId,
      updated_by: scope.profileId,
    }).select('id,status,director_key').single()
    if (leadError || !lead) return NextResponse.json({ error: 'No fue posible crear el lead.' }, { status: 422 })

    const { error: eventError } = await db.from('property_prospect_events').insert([
      {
        lead_id: lead.id,
        property_id: property.id,
        event_type: 'lead_created',
        actor_id: scope.profileId,
        to_status: 'assigned',
        note: text(body.reason) || null,
        metadata: { sourceListingId: listing.source_listing_id, sourceUrl: listing.url },
      },
      {
        lead_id: lead.id,
        property_id: property.id,
        event_type: 'director_assigned',
        actor_id: scope.profileId,
        to_status: 'assigned',
        metadata: { directorKey: lead.director_key, neighborhoodId: property.neighborhood_id },
      },
    ])
    if (eventError) return NextResponse.json({ error: 'Lead creado, pero falló el registro de auditoría.' }, { status: 422 })

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 })
  }

  if (action === 'follow_up') {
    const { data: lead, error: leadError } = await db.from('property_prospect_leads').select('*').eq('property_id', property.id).maybeSingle()
    if (leadError || !lead) return NextResponse.json({ error: 'No existe lead para esta propiedad.' }, { status: 404 })

    const nextStatus = text(body.status) || lead.status
    if (!LEAD_STATUSES.has(nextStatus)) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
    const note = text(body.note)
    const nextFollowUpAt = text(body.nextFollowUpAt) || null
    const now = new Date().toISOString()
    const eventType = nextStatus === 'won' ? 'won' : nextStatus === 'lost' ? 'lost' : nextStatus !== lead.status ? 'status_changed' : 'follow_up'

    const patch: Record<string, unknown> = {
      status: nextStatus,
      latest_note: note || lead.latest_note,
      last_follow_up_at: now,
      next_follow_up_at: nextFollowUpAt,
      updated_by: scope.profileId,
      updated_at: now,
    }
    if (!lead.first_contact_at && ['contacting','qualified','valuation','proposal','won','lost'].includes(nextStatus)) patch.first_contact_at = now
    if (nextStatus === 'won') patch.won_at = now
    if (nextStatus === 'lost') {
      patch.lost_at = now
      patch.lost_reason = text(body.lostReason) || note || null
    }

    const { error: updateError } = await db.from('property_prospect_leads').update(patch).eq('id', lead.id)
    if (updateError) return NextResponse.json({ error: 'No fue posible actualizar el seguimiento.' }, { status: 422 })

    const { error: eventError } = await db.from('property_prospect_events').insert({
      lead_id: lead.id,
      property_id: property.id,
      event_type: eventType,
      actor_id: scope.profileId,
      from_status: lead.status,
      to_status: nextStatus,
      note: note || null,
      metadata: { nextFollowUpAt, lostReason: text(body.lostReason) || null },
    })
    if (eventError) return NextResponse.json({ error: 'Seguimiento actualizado, pero falló la auditoría.' }, { status: 422 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 })
}
