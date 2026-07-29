import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function text(value: unknown) {
  return value == null ? '' : String(value).trim()
}

async function authorize() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = text(profile?.role).toLowerCase()
  if (!['admin','ceo','director','subdirector','broker','agent'].includes(role)) {
    return { response: NextResponse.json({ error: 'Sin permisos para valorizaciones' }, { status: 403 }) }
  }
  return { supabase, user, role }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize()
  if ('response' in auth) return auth.response
  const { id } = await context.params

  const [{ data: valuation, error: valuationError }, { data: saved, error: savedError }, { data: decisions, error: decisionsError }, { data: candidates, error: candidateError }] = await Promise.all([
    auth.supabase.from('valuation_cases').select('*').eq('id', id).single(),
    auth.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank'),
    auth.supabase.from('valuation_decision_log').select('*').eq('valuation_case_id', id).order('created_at', { ascending: false }).limit(200),
    auth.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: 50 }),
  ])

  const error = valuationError || savedError || decisionsError || candidateError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ valuation, saved: saved ?? [], candidates: candidates ?? [], decisions: decisions ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize()
  if ('response' in auth) return auth.response
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const action = text(body?.action)

  const { data: valuation, error: valuationError } = await auth.supabase.from('valuation_cases').select('*').eq('id', id).single()
  if (valuationError) return NextResponse.json({ error: valuationError.message }, { status: 404 })

  if (action === 'generate') {
    const limit = Math.max(1, Math.min(Number(body?.limit) || 30, 100))
    const { data: candidates, error } = await auth.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: limit })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await auth.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'candidate_generated',
      actor_id: auth.user.id,
      new_state: { count: candidates?.length ?? 0, methodology: 'valuation_candidate_pool_v1' },
      reason: text(body?.reason) || null,
    })
    return NextResponse.json({ candidates: candidates ?? [] })
  }

  if (action === 'select') {
    const candidate = body?.candidate
    if (!candidate || typeof candidate !== 'object') return NextResponse.json({ error: 'Candidato requerido' }, { status: 400 })
    const rank = Math.max(1, Number(body?.rank) || 1)
    const adjustmentPct = Number(body?.adjustmentPct) || 0
    const baseValue = candidate.price_uf == null ? null : Number(candidate.price_uf)
    const adjustedValue = baseValue == null ? null : baseValue * (1 + adjustmentPct / 100)

    const { data: comparable, error } = await auth.supabase.from('valuation_comparables').upsert({
      valuation_case_id: id,
      comparable_property_id: candidate.comparable_property_id || null,
      source_transaction_id: candidate.source_transaction_id || null,
      source_listing_id: candidate.source_listing_id || null,
      source_type: candidate.source_type || null,
      source_reference: candidate.source_reference || null,
      source_observed_at: candidate.observed_at || candidate.transaction_date || null,
      source_methodology_version: 'valuation_candidate_pool_v1',
      transaction_date: candidate.transaction_date || null,
      address: candidate.address || null,
      neighborhood: candidate.neighborhood || null,
      property_type: candidate.property_type || null,
      useful_area_m2: candidate.useful_area_m2 || null,
      built_area_m2: candidate.built_area_m2 || null,
      land_area_m2: candidate.land_area_m2 || null,
      bedrooms: candidate.bedrooms || null,
      bathrooms: candidate.bathrooms || null,
      parking_spaces: candidate.parking_spaces || null,
      price_uf: baseValue,
      price_uf_m2: candidate.price_uf_m2 || null,
      rank,
      similarity_score: Number(candidate.similarity_score) || 0,
      distance_meters: candidate.distance_meters || null,
      base_value_uf: baseValue,
      adjusted_value_uf: adjustedValue,
      adjustment_pct: adjustmentPct,
      adjustment_notes: text(body?.adjustmentNotes) || null,
      adjustments: Array.isArray(body?.adjustments) ? body.adjustments : [],
      evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
      contradictions: Array.isArray(body?.contradictions) ? body.contradictions : [],
      match_status: 'accepted',
      selected: true,
      selected_by: auth.user.id,
      selected_at: new Date().toISOString(),
      exclusion_reason: null,
      excluded_by: null,
      excluded_at: null,
    }, { onConflict: 'valuation_case_id,rank' }).select('*').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await auth.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'comparable_selected',
      actor_id: auth.user.id,
      comparable_id: comparable.id,
      new_state: comparable,
      reason: text(body?.reason) || null,
    })
    return NextResponse.json({ comparable })
  }

  if (action === 'exclude') {
    const comparableId = text(body?.comparableId)
    if (!comparableId) return NextResponse.json({ error: 'Comparable requerido' }, { status: 400 })
    const { data: previous, error: previousError } = await auth.supabase.from('valuation_comparables').select('*').eq('id', comparableId).eq('valuation_case_id', id).single()
    if (previousError) return NextResponse.json({ error: previousError.message }, { status: 404 })
    const patch = {
      selected: false,
      match_status: 'rejected',
      exclusion_reason: text(body?.reason) || 'Excluido por revisión profesional',
      excluded_by: auth.user.id,
      excluded_at: new Date().toISOString(),
    }
    const { data: comparable, error } = await auth.supabase.from('valuation_comparables').update(patch).eq('id', comparableId).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await auth.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'comparable_excluded',
      actor_id: auth.user.id,
      comparable_id: comparableId,
      previous_state: previous,
      new_state: comparable,
      reason: patch.exclusion_reason,
    })
    return NextResponse.json({ comparable })
  }

  if (action === 'adjust') {
    const comparableId = text(body?.comparableId)
    const adjustmentPct = Number(body?.adjustmentPct)
    if (!comparableId || !Number.isFinite(adjustmentPct)) return NextResponse.json({ error: 'Comparable y ajuste válidos requeridos' }, { status: 400 })
    const { data: previous, error: previousError } = await auth.supabase.from('valuation_comparables').select('*').eq('id', comparableId).eq('valuation_case_id', id).single()
    if (previousError) return NextResponse.json({ error: previousError.message }, { status: 404 })
    const adjustedValue = previous.base_value_uf == null ? null : Number(previous.base_value_uf) * (1 + adjustmentPct / 100)
    const { data: comparable, error } = await auth.supabase.from('valuation_comparables').update({
      adjustment_pct: adjustmentPct,
      adjusted_value_uf: adjustedValue,
      adjustment_notes: text(body?.adjustmentNotes) || null,
      adjustments: Array.isArray(body?.adjustments) ? body.adjustments : previous.adjustments,
    }).eq('id', comparableId).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await auth.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'adjustment_updated',
      actor_id: auth.user.id,
      comparable_id: comparableId,
      previous_state: previous,
      new_state: comparable,
      reason: text(body?.reason) || null,
    })
    return NextResponse.json({ comparable })
  }

  if (action === 'submit_for_review') {
    const { data: selected, error: selectedError } = await auth.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).eq('selected', true).order('rank')
    if (selectedError) return NextResponse.json({ error: selectedError.message }, { status: 500 })
    if (!selected?.length) return NextResponse.json({ error: 'Debe existir al menos un comparable seleccionado' }, { status: 400 })
    const values = selected.map((item) => Number(item.adjusted_value_uf ?? item.base_value_uf)).filter(Number.isFinite).sort((a,b) => a-b)
    if (!values.length) return NextResponse.json({ error: 'Los comparables seleccionados no tienen valores utilizables' }, { status: 400 })
    const midpoint = Math.floor(values.length / 2)
    const median = values.length % 2 ? values[midpoint] : (values[midpoint - 1] + values[midpoint]) / 2
    const low = values[0]
    const high = values[values.length - 1]
    const confidence = values.length >= 5 ? 'high' : values.length >= 3 ? 'medium' : 'low'
    const evidence = selected.flatMap((item) => Array.isArray(item.evidence) ? item.evidence : [])
    const { data: updated, error } = await auth.supabase.from('valuation_cases').update({
      status: 'review',
      estimated_value_uf: median,
      base_value_uf: median,
      low_value_uf: low,
      high_value_uf: high,
      confidence,
      methodology_version: 'explainable_valuation_v2_market_evidence',
      evidence,
      warnings: values.length < 3 ? ['Muestra inferior a tres comparables'] : [],
      justification: text(body?.justification) || valuation.justification,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await auth.supabase.from('valuation_case_versions').insert({
      valuation_case_id: id,
      version_number: Number(valuation.version_number || 1) + 1,
      status: 'review',
      snapshot: { valuation: updated, comparables: selected },
      created_by: auth.user.id,
    })
    await auth.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'submitted_for_review',
      actor_id: auth.user.id,
      previous_state: valuation,
      new_state: updated,
      reason: text(body?.reason) || null,
    })
    return NextResponse.json({ valuation: updated, comparables: selected })
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
