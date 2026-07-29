import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Candidate = {
  source_type: string
  source_reference: string
  comparable_property_id: string | null
  source_transaction_id: string | null
  source_listing_id: string | null
  transaction_date: string | null
  observed_at: string | null
  address: string | null
  neighborhood: string | null
  property_type: string | null
  useful_area_m2: number | null
  built_area_m2: number | null
  land_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  price_uf: number | null
  price_uf_m2: number | null
  distance_meters: number | null
  similarity_score: number
  evidence: unknown[]
}

async function getAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '').toLowerCase()
  if (!['admin','ceo','director','subdirector','broker'].includes(role)) {
    return { response: NextResponse.json({ error: 'Sin permisos para valorizaciones' }, { status: 403 }) }
  }
  return { supabase, user, role }
}

function median(values: number[]) {
  const sorted = [...values].sort((a,b) => a-b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function recalculateCase(supabase: Awaited<ReturnType<typeof createClient>>, caseId: string) {
  const { data: selected, error } = await supabase
    .from('valuation_comparables')
    .select('adjusted_value_uf,price_uf,selected,match_status')
    .eq('valuation_case_id', caseId)
    .eq('selected', true)
    .eq('match_status', 'accepted')
  if (error) throw error

  const values = (selected || [])
    .map((row) => Number(row.adjusted_value_uf ?? row.price_uf))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (!values.length) return null

  const estimate = median(values)!
  const low = Math.min(...values)
  const high = Math.max(...values)
  const confidence = values.length >= 5 ? 'high' : values.length >= 3 ? 'medium' : 'low'
  const { error: updateError } = await supabase.from('valuation_cases').update({
    base_value_uf: estimate,
    estimated_value_uf: estimate,
    low_value_uf: low,
    high_value_uf: high,
    confidence,
    methodology_version: 'market_comparables_v1',
    updated_at: new Date().toISOString(),
  }).eq('id', caseId)
  if (updateError) throw updateError
  return { estimate, low, high, confidence, selectedCount: values.length }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAccess()
  if ('response' in access) return access.response
  const { id } = await context.params

  const [{ data: valuationCase, error: caseError }, { data: comparables, error: compError }, { data: decisions, error: logError }] = await Promise.all([
    access.supabase.from('valuation_cases').select('*').eq('id', id).maybeSingle(),
    access.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank'),
    access.supabase.from('valuation_decision_log').select('*').eq('valuation_case_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  if (caseError || compError || logError) return NextResponse.json({ error: caseError?.message || compError?.message || logError?.message }, { status: 500 })
  if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
  return NextResponse.json({ valuationCase, comparables: comparables || [], decisions: decisions || [] })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAccess()
  if ('response' in access) return access.response
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')

  if (action === 'generate') {
    const limit = Math.max(1, Math.min(Number(body?.limit) || 30, 100))
    const { data: candidates, error } = await access.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: limit })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (candidates as Candidate[] | null) || []
    const existing = await access.supabase.from('valuation_comparables').select('rank').eq('valuation_case_id', id).order('rank', { ascending: false }).limit(1)
    let rank = Number(existing.data?.[0]?.rank || 0)
    const inserts = rows.map((candidate) => ({
      valuation_case_id: id,
      comparable_property_id: candidate.comparable_property_id,
      rank: ++rank,
      similarity_score: candidate.similarity_score,
      distance_meters: candidate.distance_meters,
      base_value_uf: candidate.price_uf,
      adjusted_value_uf: candidate.price_uf,
      adjustments: [],
      evidence: candidate.evidence || [],
      contradictions: [],
      match_status: 'candidate',
      source_type: candidate.source_type,
      source_reference: candidate.source_reference,
      transaction_date: candidate.transaction_date,
      address: candidate.address,
      neighborhood: candidate.neighborhood,
      property_type: candidate.property_type,
      useful_area_m2: candidate.useful_area_m2,
      built_area_m2: candidate.built_area_m2,
      land_area_m2: candidate.land_area_m2,
      bedrooms: candidate.bedrooms,
      bathrooms: candidate.bathrooms,
      parking_spaces: candidate.parking_spaces,
      price_uf: candidate.price_uf,
      price_uf_m2: candidate.price_uf_m2,
      selected: false,
      adjustment_pct: 0,
      source_transaction_id: candidate.source_transaction_id,
      source_listing_id: candidate.source_listing_id,
      source_observed_at: candidate.observed_at,
      source_methodology_version: 'valuation_candidate_pool_v1',
    }))
    if (inserts.length) {
      const { error: insertError } = await access.supabase.from('valuation_comparables').insert(inserts)
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    await access.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'candidate_generated',
      actor_id: access.user.id,
      new_state: { candidateCount: inserts.length, methodology: 'valuation_candidate_pool_v1' },
      reason: String(body?.reason || 'Generación automática desde evidencia del Módulo I'),
    })
    return NextResponse.json({ generated: inserts.length, candidates: inserts })
  }

  const comparableId = String(body?.comparableId || '')
  if (!comparableId) return NextResponse.json({ error: 'comparableId requerido' }, { status: 400 })
  const { data: previous, error: previousError } = await access.supabase.from('valuation_comparables').select('*').eq('id', comparableId).eq('valuation_case_id', id).maybeSingle()
  if (previousError) return NextResponse.json({ error: previousError.message }, { status: 500 })
  if (!previous) return NextResponse.json({ error: 'Comparable no encontrado' }, { status: 404 })

  if (action === 'select') {
    const adjustmentPct = Number(body?.adjustmentPct || 0)
    if (!Number.isFinite(adjustmentPct) || adjustmentPct < -50 || adjustmentPct > 50) return NextResponse.json({ error: 'Ajuste fuera de rango' }, { status: 400 })
    const base = Number(previous.price_uf ?? previous.base_value_uf)
    const adjusted = Number.isFinite(base) ? base * (1 + adjustmentPct / 100) : null
    const patch = {
      selected: true,
      match_status: 'accepted',
      exclusion_reason: null,
      adjustment_pct: adjustmentPct,
      adjustment_notes: String(body?.notes || '') || null,
      adjusted_value_uf: adjusted,
      selected_by: access.user.id,
      selected_at: new Date().toISOString(),
      excluded_by: null,
      excluded_at: null,
    }
    const { error } = await access.supabase.from('valuation_comparables').update(patch).eq('id', comparableId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await access.supabase.from('valuation_decision_log').insert({ valuation_case_id: id, comparable_id: comparableId, action: 'comparable_selected', actor_id: access.user.id, previous_state: previous, new_state: patch, reason: String(body?.reason || body?.notes || '') || null })
    const valuation = await recalculateCase(access.supabase, id)
    return NextResponse.json({ updated: true, valuation })
  }

  if (action === 'exclude') {
    const reason = String(body?.reason || '').trim()
    if (!reason) return NextResponse.json({ error: 'Motivo de exclusión requerido' }, { status: 400 })
    const patch = { selected: false, match_status: 'rejected', exclusion_reason: reason, excluded_by: access.user.id, excluded_at: new Date().toISOString() }
    const { error } = await access.supabase.from('valuation_comparables').update(patch).eq('id', comparableId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await access.supabase.from('valuation_decision_log').insert({ valuation_case_id: id, comparable_id: comparableId, action: 'comparable_excluded', actor_id: access.user.id, previous_state: previous, new_state: patch, reason })
    const valuation = await recalculateCase(access.supabase, id)
    return NextResponse.json({ updated: true, valuation })
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
