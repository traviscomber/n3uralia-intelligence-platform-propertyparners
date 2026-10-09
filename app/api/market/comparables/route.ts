import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { accessErrorResponse, assertProfileVisible, requireAnyCapability } from '@/lib/access-guards'

// Portal's approved Vitacura market evidence is shared across commercial roles.
// The authenticated Supabase user cannot query the underlying market_listings
// table in this view, so only these public-market reads use a server service
// client *after* the application capability check. All valuation writes retain
// the authenticated user and RLS checks.
const APPROVED_PORTAL_SOURCES = [
  'portal-inmobiliario-vitacura-portal-houses',
  'portal-inmobiliario-vitacura-portal-apartments',
] as const

async function approvedPortalSourceIds(service: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const { data, error } = await service
    .from('market_sources')
    .select('id')
    .in('code', [...APPROVED_PORTAL_SOURCES])
    .limit(APPROVED_PORTAL_SOURCES.length)
  if (error) throw new Error('PORTAL_COMPARABLE_SOURCES_UNAVAILABLE')
  return (data ?? []).map((row) => String(row.id))
}

export async function GET() {
  try {
    const scope = await requireAnyCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'])
    const supabase = await createClient()
    const service = createServiceClient()
    const approvedSourceIds = await approvedPortalSourceIds(service)
    let cases = supabase.from('valuation_cases').select('id,address,property_type,status,requested_by').eq('status', 'draft').limit(50)
    if (scope.scope !== 'global') cases = cases.in('requested_by', scope.visibleProfileIds)
    const [caseResult, listingResult] = await Promise.all([
      cases,
      approvedSourceIds.length
        ? service.from('market_current_listings')
            .select('id,property_id,source_listing_id,status,url,title,normalized_address,price_uf,price_uf_m2,observed_at,published_at')
            .in('source_id', approvedSourceIds)
            .eq('status', 'active')
            .is('removed_at', null)
            .gt('price_uf', 0)
            .order('observed_at', { ascending: false })
            .limit(80)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (caseResult.error || listingResult.error) return NextResponse.json({ error: caseResult.error?.message || listingResult.error?.message }, { status: 500 })
    return NextResponse.json({ valuationCases: caseResult.data ?? [], listings: listingResult.data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const scope = await requireAnyCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'])
    const supabase = await createClient()
    const service = createServiceClient()
    const approvedSourceIds = await approvedPortalSourceIds(service)
    if (!approvedSourceIds.length) return NextResponse.json({ error: 'No hay fuentes Portal verificadas.' }, { status: 503 })
    const body = await request.json().catch(() => null)
    const valuationCaseId = String(body?.valuationCaseId ?? '')
    const listingId = String(body?.listingId ?? '')
    if (!valuationCaseId || !listingId) return NextResponse.json({ error: 'Valorización y publicación requeridas' }, { status: 400 })

    const [{ data: valuationCase, error: caseError }, { data: listing, error: listingError }] = await Promise.all([
      supabase.from('valuation_cases').select('id,status,requested_by').eq('id', valuationCaseId).maybeSingle(),
      service.from('market_current_listings')
        .select('id,property_id,source_listing_id,status,url,title,normalized_address,price_uf,price_uf_m2,observed_at,published_at')
        .eq('id', listingId)
        .in('source_id', approvedSourceIds)
        .eq('status', 'active')
        .is('removed_at', null)
        .gt('price_uf', 0)
        .maybeSingle(),
    ])
    if (caseError || listingError) return NextResponse.json({ error: caseError?.message || listingError?.message }, { status: 500 })
    if (!valuationCase || !listing) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    assertProfileVisible(scope, valuationCase.requested_by)
    if (valuationCase.status !== 'draft') return NextResponse.json({ error: 'El expediente debe estar en borrador' }, { status: 409 })

    const { data: duplicate } = await supabase.from('valuation_comparables').select('id').eq('valuation_case_id', valuationCaseId).eq('source_listing_id', listing.id).maybeSingle()
    if (duplicate) return NextResponse.json({ error: 'La publicación ya está vinculada' }, { status: 409 })
    const { data: last } = await supabase.from('valuation_comparables').select('rank').eq('valuation_case_id', valuationCaseId).order('rank', { ascending: false }).limit(1).maybeSingle()

    const { data: comparable, error: insertError } = await supabase.from('valuation_comparables').insert({
      valuation_case_id: valuationCaseId,
      comparable_property_id: null,
      rank: Number(last?.rank ?? 0) + 1,
      similarity_score: 0,
      base_value_uf: listing.price_uf,
      adjusted_value_uf: listing.price_uf,
      adjustments: [],
      evidence: [{ module: 'market', listingId: listing.id, operationalPropertyId: listing.property_id, observedAt: listing.observed_at, url: listing.url, identityStatus: 'unconfirmed' }],
      contradictions: [],
      match_status: 'candidate',
      source_type: 'market_listing',
      source_reference: listing.url || listing.source_listing_id || listing.id,
      address: listing.normalized_address,
      price_uf: listing.price_uf,
      price_uf_m2: listing.price_uf_m2,
      selected: false,
      adjustment_pct: 0,
      source_listing_id: listing.id,
      source_observed_at: listing.observed_at,
      source_methodology_version: 'market_manual_link_v1',
    }).select().single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

    await supabase.from('valuation_decision_log').insert({
      valuation_case_id: valuationCaseId,
      action: 'market_comparable_linked',
      actor_id: scope.profileId,
      new_state: { comparableId: comparable.id, listingId: listing.id, operationalPropertyId: listing.property_id, identityStatus: 'unconfirmed' },
      reason: 'Comparable vinculado desde el Módulo I',
    })
    return NextResponse.json({ comparable }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
