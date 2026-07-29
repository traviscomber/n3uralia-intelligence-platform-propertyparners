import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  return { supabase, user }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAccess()
  if ('response' in access) return access.response
  const { id } = await params
  const [{ data: candidates, error: candidateError }, { data: selected, error: selectedError }, { data: log }] = await Promise.all([
    access.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: 50 }),
    access.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank'),
    access.supabase.from('valuation_decision_log').select('*').eq('valuation_case_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  if (candidateError || selectedError) return NextResponse.json({ error: candidateError?.message || selectedError?.message }, { status: 500 })
  return NextResponse.json({ candidates: candidates ?? [], comparables: selected ?? [], decisionLog: log ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAccess()
  if ('response' in access) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.comparables)) return NextResponse.json({ error: 'Comparables inválidos' }, { status: 400 })

  const rows = body.comparables.slice(0, 20).map((item: Record<string, unknown>, index: number) => ({
    valuation_case_id: id,
    comparable_property_id: item.comparable_property_id || null,
    rank: index + 1,
    similarity_score: Number(item.similarity_score || 0),
    distance_meters: item.distance_meters == null ? null : Number(item.distance_meters),
    base_value_uf: item.price_uf == null ? null : Number(item.price_uf),
    adjusted_value_uf: item.adjusted_value_uf == null ? item.price_uf ?? null : Number(item.adjusted_value_uf),
    adjustments: Array.isArray(item.adjustments) ? item.adjustments : [],
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
    contradictions: Array.isArray(item.contradictions) ? item.contradictions : [],
    match_status: item.selected === false ? 'rejected' : 'accepted',
    source_type: item.source_type || null,
    source_reference: item.source_reference || null,
    source_transaction_id: item.source_transaction_id || null,
    source_listing_id: item.source_listing_id || null,
    source_observed_at: item.observed_at || item.transaction_date || null,
    source_methodology_version: 'market-canonical-v1',
    transaction_date: item.transaction_date || null,
    address: item.address || null,
    neighborhood: item.neighborhood || null,
    property_type: item.property_type || null,
    useful_area_m2: item.useful_area_m2 ?? null,
    built_area_m2: item.built_area_m2 ?? null,
    land_area_m2: item.land_area_m2 ?? null,
    bedrooms: item.bedrooms ?? null,
    bathrooms: item.bathrooms ?? null,
    parking_spaces: item.parking_spaces ?? null,
    price_uf: item.price_uf ?? null,
    price_uf_m2: item.price_uf_m2 ?? null,
    selected: item.selected !== false,
    exclusion_reason: item.selected === false ? String(item.exclusion_reason || 'Excluido por analista') : null,
    adjustment_pct: Number(item.adjustment_pct || 0),
    adjustment_notes: item.adjustment_notes || null,
    selected_by: item.selected === false ? null : access.user.id,
    selected_at: item.selected === false ? null : new Date().toISOString(),
    excluded_by: item.selected === false ? access.user.id : null,
    excluded_at: item.selected === false ? new Date().toISOString() : null,
  }))

  const { error: deleteError } = await access.supabase.from('valuation_comparables').delete().eq('valuation_case_id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const { data, error } = await access.supabase.from('valuation_comparables').insert(rows).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await access.supabase.from('valuation_decision_log').insert({
    valuation_case_id: id,
    action: 'comparable_selected',
    actor_id: access.user.id,
    new_state: { count: rows.length, selected: rows.filter((row: { selected: boolean }) => row.selected).length },
    reason: typeof body.reason === 'string' ? body.reason : null,
  })

  return NextResponse.json({ comparables: data ?? [] })
}
