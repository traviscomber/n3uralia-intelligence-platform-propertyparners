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

type CandidateKeyFields = Pick<Candidate, 'source_transaction_id' | 'source_listing_id' | 'source_type' | 'source_reference'>

const ELEVATED_ROLES = ['admin', 'ceo', 'director', 'subdirector']
const VALUATION_ROLES = [...ELEVATED_ROLES, 'broker', 'partner', 'seller']

async function getAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '').toLowerCase()
  if (!VALUATION_ROLES.includes(role)) return { response: NextResponse.json({ error: 'Sin permisos para valorizaciones' }, { status: 403 }) }
  return { supabase, user, role }
}

function canOperateCase(role: string, userId: string, valuationCase: { requested_by?: string | null }) {
  return ELEVATED_ROLES.includes(role) || valuationCase.requested_by === userId
}

function candidateKey(candidate: CandidateKeyFields) {
  if (candidate.source_transaction_id) return `transaction:${candidate.source_transaction_id}`
  if (candidate.source_listing_id) return `listing:${candidate.source_listing_id}`
  return `reference:${candidate.source_type || ''}:${candidate.source_reference || ''}`
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAccess()
  if ('response' in access) return access.response
  const { id } = await context.params
  const { data: valuationCase, error: caseError } = await access.supabase.from('valuation_cases').select('*').eq('id', id).maybeSingle()
  if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })
  if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
  if (!canOperateCase(access.role, access.user.id, valuationCase)) return NextResponse.json({ error: 'No puede acceder a valorizaciones de otro usuario' }, { status: 403 })

  const [{ data: comparables, error: compError }, { data: decisions, error: logError }] = await Promise.all([
    access.supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank'),
    access.supabase.from('valuation_decision_log').select('*').eq('valuation_case_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  if (compError || logError) return NextResponse.json({ error: compError?.message || logError?.message }, { status: 500 })

  return NextResponse.json({
    valuationCase,
    comparables: comparables || [],
    decisions: decisions || [],
    permissions: {
      canEditComparables: valuationCase.status === 'draft' && (ELEVATED_ROLES.includes(access.role) || valuationCase.requested_by === access.user.id),
      canApprove: access.role === 'ceo',
      canIssue: access.role === 'ceo',
    },
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAccess()
  if ('response' in access) return access.response
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')

  const { data: valuationCase, error: caseError } = await access.supabase.from('valuation_cases').select('id,status,requested_by').eq('id', id).maybeSingle()
  if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })
  if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
  if (!canOperateCase(access.role, access.user.id, valuationCase)) return NextResponse.json({ error: 'No puede operar valorizaciones de otro usuario' }, { status: 403 })
  if (valuationCase.status !== 'draft') return NextResponse.json({ error: 'Los comparables sólo pueden modificarse en borrador' }, { status: 403 })

  if (action === 'generate') {
    const limit = Math.max(1, Math.min(Number(body?.limit) || 30, 100))
    const [{ data: candidates, error }, { data: existingRows, error: existingError }] = await Promise.all([
      access.supabase.rpc('valuation_candidate_pool', { p_case_id: id, p_limit: limit }),
      access.supabase.from('valuation_comparables').select('rank,source_transaction_id,source_listing_id,source_type,source_reference').eq('valuation_case_id', id).order('rank', { ascending: false }),
    ])
    if (error || existingError) return NextResponse.json({ error: error?.message || existingError?.message }, { status: 500 })

    const existingKeys = new Set((existingRows || []).map((row) => candidateKey(row)))
    const seenKeys = new Set(existingKeys)
    const candidateRows = (candidates as Candidate[] | null) || []
    const rows = candidateRows.filter((candidate) => {
      const key = candidateKey(candidate)
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    let rank = Number(existingRows?.[0]?.rank || 0)
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

    const duplicatesSkipped = candidateRows.length - inserts.length
    const { error: logError } = await access.supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'candidate_generated',
      actor_id: access.user.id,
      new_state: { candidateCount: inserts.length, duplicatesSkipped, methodology: 'valuation_candidate_pool_v1' },
      reason: String(body?.reason || 'Generación automática desde evidencia del Módulo I'),
    })
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })
    return NextResponse.json({ generated: inserts.length, duplicatesSkipped, candidates: inserts })
  }

  const comparableId = String(body?.comparableId || '')
  if (!comparableId) return NextResponse.json({ error: 'comparableId requerido' }, { status: 400 })
  if (!['select', 'exclude'].includes(action)) return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })

  const adjustmentPct = Number(body?.adjustmentPct || 0)
  if (!Number.isFinite(adjustmentPct) || adjustmentPct < -35 || adjustmentPct > 35) {
    return NextResponse.json({ error: 'Ajuste fuera del rango contractual de -35% a 35%' }, { status: 400 })
  }

  const reason = String(body?.reason || '').trim() || null
  if (action === 'exclude' && !reason) return NextResponse.json({ error: 'Motivo de exclusión requerido' }, { status: 400 })

  const { data, error: rpcError } = await access.supabase.rpc('apply_valuation_comparable_decision', {
    target_case_id: id,
    target_comparable_id: comparableId,
    decision: action,
    adjustment_pct: adjustmentPct,
    notes: String(body?.notes || '').trim() || null,
    reason,
  })
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
  return NextResponse.json(data)
}
