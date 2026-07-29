import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Context = { params: Promise<{ id: string }> }
type Json = Record<string, unknown>

async function access() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '').toLowerCase()
  return { supabase, user, role, executive: ['admin','ceo','director','subdirector'].includes(role) }
}

function numeric(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function caseSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data: valuationCase, error } = await supabase.from('valuation_cases').select('*').eq('id', id).single()
  if (error) throw error
  const { data: comparables } = await supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank')
  return { valuationCase, comparables: comparables ?? [] }
}

export async function GET(_: Request, context: Context) {
  const auth = await access()
  if ('response' in auth) return auth.response
  const { id } = await context.params
  const [{ data: valuationCase, error }, { data: comparables }, { data: decisions }] = await Promise.all([
    auth.supabase.from('valuation_cases').select('*').eq('id', id).single(),
    auth.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank'),
    auth.supabase.from('valuation_decision_log').select('*').eq('valuation_case_id', id).order('created_at', { ascending: false }),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  const { data: candidates, error: candidateError } = await auth.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: 50 })
  return NextResponse.json({ valuationCase, comparables: comparables ?? [], decisions: decisions ?? [], candidates: candidates ?? [], candidateError: candidateError?.message ?? null })
}

export async function POST(request: Request, context: Context) {
  const auth = await access()
  if ('response' in auth) return auth.response
  const { id } = await context.params
  const body = await request.json().catch(() => null) as Json | null
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  const action = String(body.action || '')
  const { data: valuationCase, error: caseError } = await auth.supabase.from('valuation_cases').select('*').eq('id', id).single()
  if (caseError) return NextResponse.json({ error: caseError.message }, { status: 404 })

  if (action === 'generate_candidates') {
    const limit = Math.max(1, Math.min(Number(body.limit || 30), 100))
    const { data: candidates, error } = await auth.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: limit })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = (candidates ?? []).map((candidate: Json, index: number) => ({
      valuation_case_id: id,
      comparable_property_id: candidate.comparable_property_id || null,
      rank: index + 1,
      similarity_score: numeric(candidate.similarity_score) ?? 0,
      distance_meters: numeric(candidate.distance_meters),
      base_value_uf: numeric(candidate.price_uf),
      adjusted_value_uf: numeric(candidate.price_uf),
      adjustments: [],
      evidence: candidate.evidence || [],
      contradictions: [],
      match_status: 'candidate',
      source_type: candidate.source_type,
      source_reference: candidate.source_reference,
      transaction_date: candidate.transaction_date || null,
      address: candidate.address || null,
      neighborhood: candidate.neighborhood || null,
      property_type: candidate.property_type || null,
      useful_area_m2: numeric(candidate.useful_area_m2),
      built_area_m2: numeric(candidate.built_area_m2),
      land_area_m2: numeric(candidate.land_area_m2),
      bedrooms: numeric(candidate.bedrooms),
      bathrooms: numeric(candidate.bathrooms),
      parking_spaces: numeric(candidate.parking_spaces),
      price_uf: numeric(candidate.price_uf),
      price_uf_m2: numeric(candidate.price_uf_m2),
      selected: false,
      adjustment_pct: 0,
      source_transaction_id: candidate.source_transaction_id || null,
      source_listing_id: candidate.source_listing_id || null,
      source_observed_at: candidate.observed_at || null,
      source_methodology_version: 'market-candidate-v1',
    }))
    await auth.supabase.from('valuation_comparables').delete().eq('valuation_case_id', id).eq('match_status', 'candidate')
    if (rows.length) {
      const { error: insertError } = await auth.supabase.from('valuation_comparables').insert(rows)
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    await auth.supabase.from('valuation_decision_log').insert({ valuation_case_id: id, action: 'candidate_generated', actor_id: auth.user.id, new_state: { count: rows.length, methodology: 'market-candidate-v1' } })
    return NextResponse.json(await caseSnapshot(auth.supabase, id))
  }

  if (['select_comparable','exclude_comparable','adjust_comparable'].includes(action)) {
    const comparableId = String(body.comparableId || '')
    const { data: comparable, error } = await auth.supabase.from('valuation_comparables').select('*').eq('id', comparableId).eq('valuation_case_id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    let patch: Json = {}
    let logAction: string
    if (action === 'select_comparable') {
      patch = { selected: true, match_status: 'accepted', exclusion_reason: null, selected_by: auth.user.id, selected_at: new Date().toISOString(), excluded_by: null, excluded_at: null }
      logAction = 'comparable_selected'
    } else if (action === 'exclude_comparable') {
      const reason = String(body.reason || '').trim()
      if (!reason) return NextResponse.json({ error: 'La exclusión requiere motivo' }, { status: 400 })
      patch = { selected: false, match_status: 'rejected', exclusion_reason: reason, excluded_by: auth.user.id, excluded_at: new Date().toISOString() }
      logAction = 'comparable_excluded'
    } else {
      const adjustmentPct = numeric(body.adjustmentPct)
      if (adjustmentPct == null || adjustmentPct < -50 || adjustmentPct > 50) return NextResponse.json({ error: 'Ajuste fuera de rango (-50% a 50%)' }, { status: 400 })
      const base = numeric(comparable.base_value_uf ?? comparable.price_uf)
      patch = { adjustment_pct: adjustmentPct, adjusted_value_uf: base == null ? null : base * (1 + adjustmentPct / 100), adjustment_notes: String(body.notes || '').trim() || null, adjustments: Array.isArray(body.adjustments) ? body.adjustments : comparable.adjustments }
      logAction = 'adjustment_updated'
    }
    const { error: updateError } = await auth.supabase.from('valuation_comparables').update(patch).eq('id', comparableId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    await auth.supabase.from('valuation_decision_log').insert({ valuation_case_id: id, action: logAction, actor_id: auth.user.id, comparable_id: comparableId, previous_state: comparable, new_state: patch, reason: String(body.reason || body.notes || '').trim() || null })
    return NextResponse.json(await caseSnapshot(auth.supabase, id))
  }

  if (['submit_review','approve','reject','issue'].includes(action)) {
    const selected = await auth.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).eq('selected', true)
    if (action === 'submit_review' && (selected.data?.length ?? 0) < 3) return NextResponse.json({ error: 'Se requieren al menos 3 comparables seleccionados' }, { status: 400 })
    if (['approve','reject','issue'].includes(action) && !auth.executive) return NextResponse.json({ error: 'Acción reservada a dirección' }, { status: 403 })
    const now = new Date().toISOString()
    const status = action === 'submit_review' ? 'review' : action === 'approve' ? 'approved' : action === 'issue' ? 'issued' : 'draft'
    const patch: Json = { status, updated_at: now }
    if (action === 'submit_review') Object.assign(patch, { reviewed_by: null, reviewed_at: null })
    if (action === 'approve') Object.assign(patch, { reviewed_by: auth.user.id, reviewed_at: now, approved_by: auth.user.id, approved_at: now })
    if (action === 'issue') Object.assign(patch, { issued_at: now })
    if (action === 'reject') Object.assign(patch, { warnings: [...(valuationCase.warnings || []), String(body.reason || 'Valorización rechazada para corrección')] })
    const snapshot = await caseSnapshot(auth.supabase, id)
    const nextVersion = Number(valuationCase.version_number || 1) + 1
    const { error: updateError } = await auth.supabase.from('valuation_cases').update({ ...patch, version_number: nextVersion }).eq('id', id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    await auth.supabase.from('valuation_case_versions').insert({ valuation_case_id: id, version_number: nextVersion, status, snapshot, created_by: auth.user.id })
    const logAction = action === 'submit_review' ? 'submitted_for_review' : action === 'approve' ? 'approved' : action === 'issue' ? 'issued' : 'rejected'
    await auth.supabase.from('valuation_decision_log').insert({ valuation_case_id: id, action: logAction, actor_id: auth.user.id, previous_state: valuationCase, new_state: patch, reason: String(body.reason || '').trim() || null })
    return NextResponse.json(await caseSnapshot(auth.supabase, id))
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
