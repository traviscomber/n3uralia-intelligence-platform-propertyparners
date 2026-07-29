import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const sourceSystems = ['portal_inmobiliario','cbrs','client','kml','manual_import'] as const
const datasetKinds = ['portal_apartments','portal_houses','portal_projects','registered_sales','client_sales','kml_neighborhoods'] as const

type Row = Record<string, unknown>
type SourceSystem = typeof sourceSystems[number]
type DatasetKind = typeof datasetKinds[number]

function clean(value: unknown) {
  return value == null ? '' : String(value).trim()
}

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function validate(row: Row, kind: DatasetKind) {
  const errors: string[] = []
  if (kind.startsWith('portal_') && !clean(row.source_record_id || row.listing_id || row.id)) errors.push('source_record_id requerido')
  if ((kind === 'registered_sales' || kind === 'client_sales') && !clean(row.event_key || row.source_record_id || row.id)) errors.push('event_key requerido')
  if (kind === 'kml_neighborhoods' && !clean(row.name || row.neighborhood || row.barrio)) errors.push('name requerido')
  if (kind === 'kml_neighborhoods' && (!row.geometry || typeof row.geometry !== 'object')) errors.push('geometry GeoJSON requerida')
  return errors
}

async function access() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = clean(profile?.role).toLowerCase()
  if (!['admin','ceo','director','subdirector'].includes(role)) return { response: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  return { supabase, user }
}

export async function GET() {
  const auth = await access()
  if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('market_ingestion_runs').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [], sourceSystems, datasetKinds })
}

export async function POST(request: Request) {
  const auth = await access()
  if ('response' in auth) return auth.response
  const body = await request.json().catch(() => null)
  const sourceSystem = body?.sourceSystem as SourceSystem
  const datasetKind = body?.datasetKind as DatasetKind
  const rows = Array.isArray(body?.rows) ? body.rows as Row[] : null
  if (!sourceSystems.includes(sourceSystem) || !datasetKinds.includes(datasetKind) || !rows) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  if (rows.length < 1 || rows.length > 5000) return NextResponse.json({ error: 'La carga debe contener entre 1 y 5.000 filas' }, { status: 400 })
  if (!body.authorizationConfirmed) return NextResponse.json({ error: 'Debe confirmarse la autorización de uso de la fuente' }, { status: 400 })

  const sourceFile = clean(body.sourceFile) || 'payload.json'
  const sourceSha256 = clean(body.sourceSha256) || digest(rows)
  const sourceCode = `${sourceSystem}-${sourceSha256.slice(0, 16)}`
  const sourceType = sourceSystem === 'portal_inmobiliario' ? 'portal' : sourceSystem === 'cbrs' ? 'cbrs' : sourceSystem === 'client' ? 'client' : sourceSystem === 'kml' ? 'kml' : 'other'

  const { data: source, error: sourceError } = await auth.supabase.from('market_sources').upsert({
    code: sourceCode,
    name: clean(body.sourceName) || sourceFile,
    source_type: sourceType,
    file_name: sourceFile,
    file_hash: sourceSha256,
    imported_at: new Date().toISOString(),
    row_count: rows.length,
    status: 'active',
    metadata: { authorizationConfirmed: true, datasetKind, importedBy: auth.user.id },
  }, { onConflict: 'code' }).select('id').single()
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 })

  const { data: run, error: runError } = await auth.supabase.from('market_ingestion_runs').insert({
    source_system: sourceSystem,
    dataset_kind: datasetKind,
    source_file: sourceFile,
    source_sha256: sourceSha256,
    expected_rows: rows.length,
    received_rows: rows.length,
    accepted_rows: 0,
    rejected_rows: 0,
    status: 'running',
    metadata: { sourceId: source.id, authorizationConfirmed: true, importedBy: auth.user.id },
  }).select('id').single()
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  let accepted = 0
  let rejected = 0
  const sampleErrors: Array<{ row: number; errors: string[] }> = []

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const errors = validate(row, datasetKind)
    const sourceRecordId = clean(row.source_record_id || row.listing_id || row.event_key || row.id) || null
    const { error } = await auth.supabase.from('market_raw_records').upsert({
      ingestion_run_id: run.id,
      source_system: sourceSystem,
      dataset_kind: datasetKind,
      source_record_id: sourceRecordId,
      source_file: sourceFile,
      source_row_number: index + 1,
      record_hash: digest(row),
      payload: row,
      observed_at: clean(row.observed_at || row.transaction_date || row.fecha) || null,
      validation_status: errors.length ? 'rejected' : 'accepted',
      validation_errors: errors,
    }, { onConflict: 'dataset_kind,record_hash' })

    if (error || errors.length) {
      rejected++
      sampleErrors.push({ row: index + 1, errors: error ? [error.message] : errors })
      continue
    }

    if (datasetKind === 'kml_neighborhoods') {
      const { error: neighborhoodError } = await auth.supabase.from('market_neighborhoods').upsert({
        name: clean(row.name || row.neighborhood || row.barrio),
        micro_neighborhood: clean(row.micro_neighborhood || row.microbarrio) || null,
        geometry: row.geometry,
        geometry_source_id: source.id,
        assignment_status: 'exact',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'name' })
      if (neighborhoodError) {
        rejected++
        sampleErrors.push({ row: index + 1, errors: [neighborhoodError.message] })
        continue
      }
    }
    accepted++
  }

  await auth.supabase.from('market_ingestion_runs').update({
    accepted_rows: accepted,
    rejected_rows: rejected,
    status: accepted ? 'completed' : 'rejected',
    completed_at: new Date().toISOString(),
    error_message: rejected ? `${rejected} filas rechazadas` : null,
    metadata: { sourceId: source.id, authorizationConfirmed: true, importedBy: auth.user.id, sampleErrors: sampleErrors.slice(0, 100) },
  }).eq('id', run.id)

  return NextResponse.json({ runId: run.id, sourceId: source.id, received: rows.length, accepted, rejected, sampleErrors: sampleErrors.slice(0, 100) })
}
