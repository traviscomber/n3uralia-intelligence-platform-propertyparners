import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const outputRoot = path.resolve(process.env.QA_OUTPUT_DIR || 'artifacts/authenticated-role-qa')
const sharedPassword = process.env.QA_PASSWORD || null

if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL y SUPABASE_ANON_KEY son requeridos.')

const profiles = [
  { key: 'ceo', expectedRole: 'ceo', email: process.env.QA_CEO_EMAIL, password: process.env.QA_CEO_PASSWORD || sharedPassword },
  { key: 'director', expectedRole: 'director', email: process.env.QA_DIRECTOR_EMAIL, password: process.env.QA_DIRECTOR_PASSWORD || sharedPassword },
  { key: 'subdirector', expectedRole: 'subdirector', email: process.env.QA_SUBDIRECTOR_EMAIL, password: process.env.QA_SUBDIRECTOR_PASSWORD || sharedPassword },
  { key: 'partner-lo-beltran', expectedRole: 'seller', email: process.env.QA_LO_BELTRAN_EMAIL, password: process.env.QA_LO_BELTRAN_PASSWORD || sharedPassword },
  { key: 'partner-nueva-costanera', expectedRole: 'seller', email: process.env.QA_NUEVA_COSTANERA_EMAIL, password: process.env.QA_NUEVA_COSTANERA_PASSWORD || sharedPassword },
  { key: 'partner-santa-maria', expectedRole: 'seller', email: process.env.QA_SANTA_MARIA_EMAIL, password: process.env.QA_SANTA_MARIA_PASSWORD || sharedPassword },
].filter((profile) => profile.email)

if (!profiles.length) throw new Error('Debe configurarse al menos una cuenta QA_*_EMAIL.')
for (const profile of profiles) {
  if (!profile.password) throw new Error(`Falta contraseña para el perfil QA ${profile.key}.`)
}

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()

async function query(client, table, columns = '*') {
  const result = await client.from(table).select(columns)
  if (result.error) throw new Error(`${table}: ${result.error.message}`)
  return result.data ?? []
}

function assertEntityScope(profile, userId, entities) {
  const role = normalize(profile.role)
  if (role === 'admin' || role === 'ceo') return

  if (role === 'seller') {
    assert.ok(entities.length <= 1, `seller recibió ${entities.length} entidades`)
    for (const entity of entities) {
      assert.equal(entity.profile_id, userId, `seller recibió entidad ajena ${entity.name}`)
      assert.ok(['partner', 'agent'].includes(entity.entity_type), `seller recibió tipo ${entity.entity_type}`)
    }
    return
  }

  if (role === 'director' || role === 'subdirector') {
    const offices = entities.filter((entity) => ['office', 'team'].includes(entity.entity_type))
    assert.ok(offices.length <= 1, `${role} recibió más de una oficina`)
    if (offices.length) {
      assert.equal(normalize(offices[0].name), normalize(profile.team), `${role} recibió oficina fuera de alcance`)
    }
    const allowedOfficeIds = new Set(offices.map((office) => office.id))
    for (const entity of entities.filter((row) => ['partner', 'agent'].includes(row.entity_type))) {
      assert.ok(allowedOfficeIds.has(entity.parent_id), `${role} recibió partner fuera de su oficina: ${entity.name}`)
    }
    assert.ok(!entities.some((entity) => entity.entity_type === 'company'), `${role} recibió entidad company`)
    return
  }

  throw new Error(`Rol QA no soportado: ${profile.role}`)
}

function assertForeignKeysWithinVisibleEntities(table, rows, visibleEntityIds) {
  for (const row of rows) {
    assert.ok(visibleEntityIds.has(row.entity_id), `${table} expuso entity_id fuera del alcance: ${row.entity_id}`)
  }
}

function assertOperationalScope(profile, userId, entities, valuationCases, assignments) {
  const role = normalize(profile.role)
  const visibleProfileIds = new Set(entities.map((entity) => entity.profile_id).filter(Boolean))

  if (role === 'seller') {
    for (const valuation of valuationCases) assert.equal(valuation.requested_by, userId, 'seller recibió valorización ajena')
    for (const assignment of assignments) assert.equal(assignment.assigned_to, userId, 'seller recibió asignación ajena')
  }

  if (role === 'director' || role === 'subdirector') {
    for (const valuation of valuationCases) {
      assert.ok(visibleProfileIds.has(valuation.requested_by), `${role} recibió valorización de perfil externo`)
    }
    for (const assignment of assignments) {
      assert.ok(visibleProfileIds.has(assignment.assigned_to), `${role} recibió asignación de perfil externo`)
    }
  }
}

await fs.mkdir(outputRoot, { recursive: true })
const results = []

for (const spec of profiles) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const startedAt = new Date().toISOString()
  try {
    const auth = await client.auth.signInWithPassword({ email: spec.email, password: spec.password })
    if (auth.error || !auth.data.user) throw new Error(auth.error?.message || 'Login sin usuario')

    const userId = auth.data.user.id
    const profileResult = await client.from('profiles').select('id,role,full_name,team').eq('id', userId).single()
    if (profileResult.error) throw new Error(`profiles: ${profileResult.error.message}`)
    const profile = profileResult.data
    assert.equal(normalize(profile.role), spec.expectedRole, `Rol inesperado para ${spec.key}`)

    const [entities, metrics, goals, alerts, valuationCases, assignments] = await Promise.all([
      query(client, 'management_entities', 'id,entity_type,name,parent_id,profile_id'),
      query(client, 'management_metric_values', 'id,entity_id,metric_code,period_start,period_end'),
      query(client, 'management_goals', 'id,entity_id,metric_code,period_start,period_end'),
      query(client, 'management_alerts', 'id,entity_id,metric_code,status'),
      query(client, 'valuation_cases', 'id,requested_by,status'),
      query(client, 'property_assignments', 'id,assigned_to,status'),
    ])

    assertEntityScope(profile, userId, entities)
    const visibleEntityIds = new Set(entities.map((entity) => entity.id))
    assertForeignKeysWithinVisibleEntities('management_metric_values', metrics, visibleEntityIds)
    assertForeignKeysWithinVisibleEntities('management_goals', goals, visibleEntityIds)
    assertForeignKeysWithinVisibleEntities('management_alerts', alerts, visibleEntityIds)
    assertOperationalScope(profile, userId, entities, valuationCases, assignments)

    results.push({
      profile: spec.key,
      role: profile.role,
      team: profile.team,
      status: 'passed',
      startedAt,
      completedAt: new Date().toISOString(),
      counts: {
        entities: entities.length,
        metrics: metrics.length,
        goals: goals.length,
        alerts: alerts.length,
        valuationCases: valuationCases.length,
        assignments: assignments.length,
      },
    })
  } catch (error) {
    results.push({
      profile: spec.key,
      expectedRole: spec.expectedRole,
      status: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await client.auth.signOut().catch(() => null)
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'Supabase Auth + caller-scoped RLS queries',
  note: 'No contraseñas, tokens, correos ni datos de filas se escriben en el artefacto.',
  results,
}

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
const failures = results.filter((result) => result.status === 'failed')
console.log(JSON.stringify({ profiles: results.length, failures: failures.length, outputRoot }, null, 2))
if (failures.length) process.exitCode = 1
