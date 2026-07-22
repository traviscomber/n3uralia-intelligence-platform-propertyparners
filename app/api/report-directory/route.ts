import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireExecutiveAccess } from '@/lib/api-access'
import presentations from '@/data/presentations-2026.json'

export const dynamic = 'force-dynamic'

type Entity = 'person' | 'assignment' | 'subscription'
const tables = { person: 'report_people', assignment: 'report_branch_assignments', subscription: 'report_subscriptions' } as const
const fields = {
  person: ['full_name', 'email', 'phone', 'person_role', 'source_key', 'origin', 'active'],
  assignment: ['person_id', 'branch_name', 'assignment_role', 'origin', 'valid_from', 'valid_to', 'active'],
  subscription: ['person_id', 'audience', 'channel', 'recipient', 'cadence', 'active'],
} as const

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createServiceClient(url, key)
}

function clean(value: unknown) { return typeof value === 'string' ? value.trim() : value }
function entityOf(value: unknown): Entity | null { return value === 'person' || value === 'assignment' || value === 'subscription' ? value : null }
function permitted(entity: Entity, body: Record<string, unknown>) {
  return Object.fromEntries(fields[entity].filter((key) => key in body).map((key) => {
    const value = clean(body[key])
    return [key, value === '' ? null : value]
  }))
}

function validate(entity: Entity, values: Record<string, unknown>) {
  const branches = presentations.management.branches.map((item) => item.branch)
  if (entity === 'person') {
    if (!values.full_name || !['ceo', 'director', 'executive'].includes(String(values.person_role))) return 'Nombre y rol son requeridos.'
  }
  if (entity === 'assignment') {
    if (!values.person_id || !branches.includes(String(values.branch_name)) || !['director', 'executive'].includes(String(values.assignment_role))) return 'Persona, sucursal fuente y rol son requeridos.'
  }
  if (entity === 'subscription') {
    if (!values.person_id || !values.recipient || !['ceo', 'director-cuenta', 'ejecutivo'].includes(String(values.audience)) || !['email', 'whatsapp_web', 'webhook'].includes(String(values.channel))) return 'Persona, audiencia, canal y destinatario son requeridos.'
  }
  return null
}

async function audit(db: ReturnType<typeof service>, actorId: string, action: string, entity: Entity, id: string, before: unknown, after: unknown) {
  const { error } = await db.from('report_directory_audit_log').insert({ actor_id: actorId, action, entity_type: entity, entity_id: id, before_state: before, after_state: after })
  if (error) throw error
}

export async function GET() {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const db = service()
    const [people, assignments, subscriptions, auditLog] = await Promise.all([
      db.from('report_people').select('*').order('full_name'),
      db.from('report_branch_assignments').select('*, person:report_people(id, full_name, person_role)').order('created_at', { ascending: false }),
      db.from('report_subscriptions').select('*, person:report_people(id, full_name, person_role)').order('created_at', { ascending: false }),
      db.from('report_directory_audit_log').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    const failure = [people, assignments, subscriptions, auditLog].find((result) => result.error)
    if (failure?.error) throw failure.error
    return NextResponse.json({
      people: people.data || [], assignments: assignments.data || [], subscriptions: subscriptions.data || [], auditLog: auditLog.data || [],
      candidates: { branches: presentations.management.branches.map((item) => item.branch), partners: presentations.management.partners.map((item) => ({ name: item.name, branch: item.branch, sourceKey: `${item.branch}:${item.name}` })) },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos cargar el directorio.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const body = await request.json() as Record<string, unknown>
    const entity = entityOf(body.entity)
    if (!entity) return NextResponse.json({ error: 'Entidad inválida.' }, { status: 400 })
    const values = permitted(entity, body)
    const invalid = validate(entity, values)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
    const db = service()
    const { data, error } = await db.from(tables[entity]).insert(values).select('*').single()
    if (error) throw error
    await audit(db, access.userId, 'create', entity, String(data.id), null, data)
    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos crear el registro.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const body = await request.json() as Record<string, unknown>
    const entity = entityOf(body.entity)
    const id = clean(body.id)
    if (!entity || !id) return NextResponse.json({ error: 'Entidad e id son requeridos.' }, { status: 400 })
    const db = service()
    const { data: before, error: beforeError } = await db.from(tables[entity]).select('*').eq('id', id).single()
    if (beforeError) throw beforeError
    const values = permitted(entity, body)
    if (!Object.keys(values).length) return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 })
    const invalid = validate(entity, { ...before, ...values })
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
    const { data, error } = await db.from(tables[entity]).update(values).eq('id', id).select('*').single()
    if (error) throw error
    await audit(db, access.userId, 'update', entity, String(id), before, data)
    return NextResponse.json({ item: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos actualizar el registro.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const body = await request.json() as Record<string, unknown>
    const entity = entityOf(body.entity)
    const id = clean(body.id)
    if (!entity || !id) return NextResponse.json({ error: 'Entidad e id son requeridos.' }, { status: 400 })
    const db = service()
    if (entity === 'person') {
      const [{ count: assignments }, { count: subscriptions }] = await Promise.all([
        db.from('report_branch_assignments').select('id', { count: 'exact', head: true }).eq('person_id', id).eq('active', true),
        db.from('report_subscriptions').select('id', { count: 'exact', head: true }).eq('person_id', id).eq('active', true),
      ])
      if ((assignments || 0) + (subscriptions || 0) > 0) return NextResponse.json({ error: 'Desactiva primero las asignaciones y suscripciones activas de esta persona.' }, { status: 409 })
    }
    const { data: before, error: beforeError } = await db.from(tables[entity]).select('*').eq('id', id).single()
    if (beforeError) throw beforeError
    const { data, error } = await db.from(tables[entity]).update({ active: false }).eq('id', id).select('*').single()
    if (error) throw error
    await audit(db, access.userId, 'deactivate', entity, String(id), before, data)
    return NextResponse.json({ item: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos desactivar el registro.' }, { status: 500 })
  }
}
