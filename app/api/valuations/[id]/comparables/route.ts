import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  accessErrorResponse,
  assertProfileVisible,
  requireAnyCapability,
} from '@/lib/access-guards'

async function getAccess() {
  const scope = await requireAnyCapability([
    'valuations.self.read',
    'valuations.office.read',
    'valuations.global.read',
  ])
  const supabase = await createClient()
  return { supabase, scope }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, scope } = await getAccess()
    const { id } = await context.params
    const { data: valuationCase, error: caseError } = await supabase.from('valuation_cases').select('*').eq('id', id).maybeSingle()
    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    assertProfileVisible(scope, valuationCase.requested_by)

    if (valuationCase.status === 'issued') {
      const { data: issuedVersion, error: versionError } = await supabase
        .from('valuation_case_versions')
        .select('version_number,snapshot,created_at')
        .eq('valuation_case_id', id)
        .eq('status', 'issued')
        .eq('version_number', valuationCase.version_number)
        .maybeSingle()

      if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 })
      if (!issuedVersion) {
        return NextResponse.json({
          error: 'La valorización está emitida, pero falta su snapshot histórico. No se permite reconstruir un informe emitido desde datos vivos.',
          code: 'ISSUED_SNAPSHOT_MISSING',
        }, { status: 409 })
      }

      const snapshot = record(issuedVersion.snapshot)
      const frozenCase = record(snapshot?.valuationCase)
      const frozenComparables = Array.isArray(snapshot?.comparables) ? snapshot.comparables : null
      const frozenDecisions = Array.isArray(snapshot?.decisionHistory) ? snapshot.decisionHistory : null

      if (!snapshot || !frozenCase || !frozenComparables || !frozenDecisions) {
        return NextResponse.json({
          error: 'El snapshot emitido no contiene el expediente completo requerido para reproducir el informe.',
          code: 'ISSUED_SNAPSHOT_INVALID',
        }, { status: 409 })
      }

      return NextResponse.json({
        valuationCase: frozenCase,
        comparables: frozenComparables,
        decisions: frozenDecisions,
        permissions: {
          canEditComparables: false,
          canApprove: false,
          canIssue: false,
        },
        documentStatus: 'issued',
        snapshot: {
          schemaVersion: snapshot.snapshotSchemaVersion ?? null,
          capturedAt: snapshot.capturedAt ?? issuedVersion.created_at,
          sha256: snapshot.snapshotSha256 ?? null,
          hashAlgorithm: snapshot.snapshotHashAlgorithm ?? null,
          versionNumber: issuedVersion.version_number,
        },
      })
    }

    const [{ data: comparables, error: compError }, { data: decisions, error: logError }] = await Promise.all([
      supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).order('rank'),
      supabase.from('valuation_decision_log').select('*').eq('valuation_case_id', id).order('created_at', { ascending: false }).limit(100),
    ])
    if (compError || logError) return NextResponse.json({ error: compError?.message || logError?.message }, { status: 500 })

    const ownsCase = valuationCase.requested_by === scope.profileId
    const canReview = scope.capabilities.includes('valuations.office.review')
    const canApprove = scope.capabilities.includes('valuations.global.approve')

    return NextResponse.json({
      valuationCase,
      comparables: comparables || [],
      decisions: decisions || [],
      permissions: {
        canEditComparables: valuationCase.status === 'draft' && (ownsCase || canReview || canApprove),
        canApprove,
        canIssue: canApprove,
      },
      documentStatus: 'preview',
      snapshot: null,
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, scope } = await getAccess()
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const action = String(body?.action || '')

    const { data: valuationCase, error: caseError } = await supabase.from('valuation_cases').select('id,status,requested_by').eq('id', id).maybeSingle()
    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    assertProfileVisible(scope, valuationCase.requested_by)

    const ownsCase = valuationCase.requested_by === scope.profileId
    const canReview = scope.capabilities.includes('valuations.office.review')
    const canApprove = scope.capabilities.includes('valuations.global.approve')
    if (!ownsCase && !canReview && !canApprove) return NextResponse.json({ error: 'Sin permiso para operar comparables' }, { status: 403 })
    if (valuationCase.status !== 'draft') return NextResponse.json({ error: 'Los comparables sólo pueden modificarse en borrador' }, { status: 403 })

    if (action === 'generate') {
      return NextResponse.json({
        error: 'El generador legacy de candidatos está deshabilitado. Los comparables canónicos deben generarse desde el Valorizador con Portal/CBRS y metodología Property Partners separados.',
        code: 'LEGACY_VALUATION_CANDIDATE_GENERATOR_DISABLED',
      }, { status: 409 })
    }

    const comparableId = String(body?.comparableId || '')
    if (!comparableId) return NextResponse.json({ error: 'comparableId requerido' }, { status: 400 })
    if (!['select', 'exclude'].includes(action)) return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })

    const adjustmentPct = Number(body?.adjustmentPct || 0)
    if (!Number.isFinite(adjustmentPct) || adjustmentPct < -35 || adjustmentPct > 35) {
      return NextResponse.json({ error: 'Ajuste documentado fuera del rango de -35% a 35%' }, { status: 400 })
    }

    const reason = String(body?.reason || '').trim() || null
    if (action === 'exclude' && !reason) return NextResponse.json({ error: 'Motivo de exclusión requerido' }, { status: 400 })

    const { data, error: rpcError } = await supabase.rpc('apply_valuation_comparable_decision', {
      target_case_id: id,
      target_comparable_id: comparableId,
      decision: action,
      adjustment_pct: adjustmentPct,
      notes: String(body?.notes || '').trim() || null,
      reason,
    })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error) {
    return accessErrorResponse(error)
  }
}
