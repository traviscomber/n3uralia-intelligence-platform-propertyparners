import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { accessErrorResponse, requireUserScope } from '@/lib/access-guards'

const allowedKinds = new Set(['preference', 'context'])

type MemoryRow = {
  id: string
  scope_type: 'profile' | 'office' | 'global'
  subject_profile_id: string | null
  office: string | null
  memory_kind: 'preference' | 'context' | 'decision' | 'outcome' | 'fact_reference'
  content: string
  source_kind: 'user_confirmed' | 'system_event' | 'canonical_reference'
  source_reference: string | null
  status: 'active' | 'superseded' | 'expired'
  confidence: 'confirmed' | 'bounded'
  expires_at: string | null
  created_at: string
  updated_at: string
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isVisibleMemory(row: MemoryRow, profileId: string, team: string | null) {
  if (row.scope_type === 'global') return true
  if (row.scope_type === 'profile') return row.subject_profile_id === profileId
  if (row.scope_type === 'office') return Boolean(team && row.office === team)
  return false
}

function isCurrentMemory(row: MemoryRow, nowMs: number) {
  if (row.status !== 'active') return false
  if (!row.expires_at) return true
  return Date.parse(row.expires_at) > nowMs
}

export async function GET() {
  try {
    const scope = await requireUserScope()
    const supabase = getAdminClient()
    const nowMs = Date.now()

    const { data, error } = await supabase
      .from('pedro_pablo_memory_items')
      .select('id,scope_type,subject_profile_id,office,memory_kind,content,source_kind,source_reference,status,confidence,expires_at,created_at,updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[pedro-pablo-memory] load failed', { code: error.code })
      return NextResponse.json({ error: 'No fue posible cargar la memoria confirmada.' }, { status: 500 })
    }

    const memories = ((data ?? []) as MemoryRow[])
      .filter((row) => isVisibleMemory(row, scope.profileId, scope.team))
      .filter((row) => isCurrentMemory(row, nowMs))
      .slice(0, 30)

    return NextResponse.json({
      memories,
      memoryPolicy: 'explicit-confirmation-provenance-bound-noncanonical',
      canonicalAuthority: false,
      generatedAt: new Date().toISOString(),
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await requireUserScope()
    const body = await request.json()
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    const memoryKind = typeof body?.memoryKind === 'string' ? body.memoryKind : ''
    const confirm = body?.confirm === true
    const expiresAt = typeof body?.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null

    if (!confirm) {
      return NextResponse.json({
        error: 'Se requiere confirmación explícita para guardar memoria.',
        confirmationRequired: true,
      }, { status: 409 })
    }
    if (!allowedKinds.has(memoryKind)) {
      return NextResponse.json({ error: 'Tipo de memoria no permitido para ingreso manual.' }, { status: 400 })
    }
    if (!content || content.length > 1000) {
      return NextResponse.json({ error: 'La memoria debe contener entre 1 y 1000 caracteres.' }, { status: 400 })
    }
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
      return NextResponse.json({ error: 'Fecha de expiración inválida.' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data: existing, error: existingError } = await supabase
      .from('pedro_pablo_memory_items')
      .select('id,content,memory_kind,created_at')
      .eq('scope_type', 'profile')
      .eq('subject_profile_id', scope.profileId)
      .eq('status', 'active')
      .eq('memory_kind', memoryKind)
      .eq('content', content)
      .limit(1)
      .maybeSingle()

    if (existingError) {
      console.error('[pedro-pablo-memory] duplicate lookup failed', { code: existingError.code })
      return NextResponse.json({ error: 'No fue posible validar la memoria.' }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json({ memory: existing, duplicate: true, writesPerformed: 0 })
    }

    const { data, error } = await supabase
      .from('pedro_pablo_memory_items')
      .insert({
        scope_type: 'profile',
        subject_profile_id: scope.profileId,
        memory_kind: memoryKind,
        content,
        source_kind: 'user_confirmed',
        source_reference: 'pedro-pablo-explicit-memory',
        status: 'active',
        confidence: 'confirmed',
        expires_at: expiresAt,
        created_by: scope.profileId,
      })
      .select('id,scope_type,subject_profile_id,office,memory_kind,content,source_kind,source_reference,status,confidence,expires_at,created_at,updated_at')
      .single()

    if (error) {
      console.error('[pedro-pablo-memory] create failed', { code: error.code })
      return NextResponse.json({ error: 'No fue posible guardar la memoria confirmada.' }, { status: 500 })
    }

    return NextResponse.json({
      memory: data,
      confirmationRecorded: true,
      canonicalAuthority: false,
      writesPerformed: 1,
    }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
