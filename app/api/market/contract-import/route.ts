import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const sourceSystems = ['portal_inmobiliario','cbrs','client','kml','manual_import'] as const
const datasetKinds = ['portal_apartments','portal_houses','portal_projects','registered_sales','client_sales','kml_neighborhoods'] as const

type Row = Record<string, unknown>
type SourceSystem = typeof sourceSystems[number]
type DatasetKind = typeof datasetKinds[number]

function clean(value: unknown) { return value == null ? '' : String(value).trim() }
function numeric(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : null }
function integer(value: unknown) { const n = numeric(value); return n == null ? null : Math.trunc(n) }
function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function validate(row: Row, kind: DatasetKind) {
  const errors: string[] = []
  if (kind.startsWith('portal_') && !clean(row.source_record_id || row.listing_id || row.id)) errors.push('source_record_id requerido')
  if ((kind === 'registered_sales' || kind === 'client_sales') && !clean(row.event_key || row.source_record_id || row.id)) errors.push('event_key requerido')
  if (kind === 'kml_neighborhoods' && !clean(row.name || row.neighborhood || row.barrio)) errors.push('name requerido')
  if (kind === 'kml_neighborhoods' && (!row.geometry || typeof row.geometry !== 'object')) errors.push('geometry GeoJSON requerida')
  return errors
}
function canonicalKey(row: Row, system: SourceSystem) {
  const rol = clean(row.rol)
  if (rol) return `rol:${rol.toLowerCase()}`
  const address = clean(row.normalized_address || row.address || row.direccion).toLowerCase().replace(/\s+/g, ' ')
  const unit = clean(row.unit_number || row.unidad).toLowerCase()
  const commune = clean(row.commune || row.comuna).toLowerCase()
  const sourceId = clean(row.source_record_id || row.listing_id || row.event_key || row.id)
  return address ? `addr:${commune}:${address}:${unit}` : `source:${system}:${sourceId || digest(row)}`
}
function propertyType(kind: DatasetKind, value: unknown) {
  const raw = clean(value).toLowerCase()
  if (kind === 'portal_houses' || raw.includes('casa')) return 'Casa'
  if (kind === 'portal_apartments' || raw.includes('depart')) return 'Departamento'
  if (kind === 'portal_projects' || raw.includes('proyecto')) return 'Proyecto'
  return 'Otro'
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
    code: sourceCode, name: clean(body.sourceName) || sourceFile, source_type: sourceType, file_name: sourceFile,
    file_hash: sourceSha256, imported_at: new Date().toISOString(), row_count: rows.length, status: 'active',
    metadata: { authorizationConfirmed: true, datasetKind, importedBy: auth.user.id },
  }, { onConflict: 'code' }).select('id').single()
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 })

  const { data: run, error: runError } = await auth.supabase.from('market_ingestion_runs').insert({
    source_system: sourceSystem, dataset_kind: datasetKind, source_file: sourceFile, source_sha256: sourceSha256,
    expected_rows: rows.length, received_rows: rows.length, accepted_rows: 0, rejected_rows: 0, status: 'running',
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
    const observedAt = clean(row.observed_at || row.transaction_date || row.fecha) || new Date().toISOString()
    const recordHash = digest(row)
    const { data: raw, error: rawError } = await auth.supabase.from('market_raw_records').upsert({
      ingestion_run_id: run.id, source_system: sourceSystem, dataset_kind: datasetKind, source_record_id: sourceRecordId,
      source_file: sourceFile, source_row_number: index + 1, record_hash: recordHash, payload: row, observed_at: observedAt,
      validation_status: errors.length ? 'rejected' : 'accepted', validation_errors: errors,
    }, { onConflict: 'dataset_kind,record_hash' }).select('id').single()
    if (rawError || errors.length) {
      rejected++
      sampleErrors.push({ row: index + 1, errors: rawError ? [rawError.message] : errors })
      continue
    }

    try {
      if (datasetKind === 'kml_neighborhoods') {
        const { error } = await auth.supabase.from('market_neighborhoods').upsert({
          name: clean(row.name || row.neighborhood || row.barrio), micro_neighborhood: clean(row.micro_neighborhood || row.microbarrio) || null,
          geometry: row.geometry, geometry_source_id: source.id, assignment_status: 'exact', updated_at: new Date().toISOString(),
        }, { onConflict: 'name' })
        if (error) throw error
        accepted++
        continue
      }

      const key = canonicalKey(row, sourceSystem)
      const neighborhoodName = clean(row.neighborhood || row.barrio)
      const normalizedAddress = clean(row.normalized_address || row.address || row.direccion) || null
      const type = propertyType(datasetKind, row.property_type || row.tipo)
      let neighborhoodId: string | null = null
      if (neighborhoodName) {
        const { data } = await auth.supabase.from('market_neighborhoods').select('id').eq('name', neighborhoodName).maybeSingle()
        neighborhoodId = data?.id ?? null
      }
      const { data: property, error: propertyError } = await auth.supabase.from('market_properties').upsert({
        canonical_key: key, property_type: type, normalized_address: normalizedAddress,
        street_name: clean(row.street_name || row.calle) || null, street_number: clean(row.street_number || row.numero_calle) || null,
        unit_number: clean(row.unit_number || row.unidad) || null, rol: clean(row.rol) || null,
        latitude: numeric(row.latitude || row.latitud), longitude: numeric(row.longitude || row.longitud), neighborhood_id: neighborhoodId,
        land_area_m2: numeric(row.land_area_m2 || row.superficie_terreno), built_area_m2: numeric(row.built_area_m2 || row.superficie_construida),
        useful_area_m2: numeric(row.useful_area_m2 || row.superficie_util), bedrooms: integer(row.bedrooms || row.dormitorios),
        bathrooms: integer(row.bathrooms || row.banos), parking_spaces: integer(row.parking_spaces || row.estacionamientos),
        identity_status: clean(row.rol) ? 'confirmed' : 'candidate', identity_confidence: clean(row.rol) ? 1 : 0.6,
        identity_evidence: [{ sourceSystem, sourceRecordId, recordHash }], first_seen_at: observedAt, last_seen_at: observedAt, updated_at: new Date().toISOString(),
      }, { onConflict: 'canonical_key' }).select('id').single()
      if (propertyError) throw propertyError

      const canonicalType = type === 'Casa' ? 'house' : type === 'Departamento' ? 'apartment' : type === 'Proyecto' ? 'project' : 'other'
      const { error: canonicalError } = await auth.supabase.from('market_properties_canonical').upsert({
        canonical_key: key, source_system: sourceSystem, source_record_id: sourceRecordId, latest_raw_record_id: raw.id,
        operation: datasetKind.startsWith('portal_') ? 'sale' : 'unknown', property_type: canonicalType,
        commune: clean(row.commune || row.comuna) || null, neighborhood: neighborhoodName || null, address: normalizedAddress,
        latitude: numeric(row.latitude || row.latitud), longitude: numeric(row.longitude || row.longitud),
        price_uf: numeric(row.price_uf || row.precio_uf), built_area_m2: numeric(row.built_area_m2 || row.superficie_construida),
        total_area_m2: numeric(row.total_area_m2 || row.superficie_total || row.land_area_m2), bedrooms: integer(row.bedrooms || row.dormitorios),
        bathrooms: integer(row.bathrooms || row.banos), parking_spaces: integer(row.parking_spaces || row.estacionamientos),
        listing_status: datasetKind.startsWith('portal_') ? 'active' : 'unknown', first_seen_at: observedAt, last_seen_at: observedAt,
        completeness_pct: 50, quality_issues: [], attributes: { sourceId: source.id }, updated_at: new Date().toISOString(),
      }, { onConflict: 'canonical_key' })
      if (canonicalError) throw canonicalError

      if (datasetKind.startsWith('portal_')) {
        const priceUf = numeric(row.price_uf || row.precio_uf)
        const area = numeric(row.useful_area_m2 || row.superficie_util || row.built_area_m2)
        const { error } = await auth.supabase.from('market_listings').upsert({
          source_id: source.id, source_listing_id: sourceRecordId!, property_id: property.id, operation: 'Venta',
          status: clean(row.status) || 'active', url: clean(row.url) || null, title: clean(row.title || row.titulo) || null,
          raw_address: clean(row.raw_address || row.address || row.direccion) || null, normalized_address: normalizedAddress,
          latitude: numeric(row.latitude || row.latitud), longitude: numeric(row.longitude || row.longitud),
          price_clp: numeric(row.price_clp || row.precio_clp), price_uf: priceUf, price_uf_m2: priceUf && area ? priceUf / area : null,
          published_at: clean(row.published_at || row.fecha_publicacion) || null, observed_at: observedAt, raw_payload: row,
        }, { onConflict: 'source_id,source_listing_id,observed_at' })
        if (error) throw error
      } else {
        const eventKey = clean(row.event_key || row.source_record_id || row.id)
        const priceUf = numeric(row.price_uf || row.precio_uf)
        const area = numeric(row.useful_area_m2 || row.superficie_util || row.built_area_m2)
        const { error } = await auth.supabase.from('market_transactions').upsert({
          source_id: source.id, event_key: eventKey, asset_key: key, property_id: property.id, rol: clean(row.rol) || null,
          transaction_date: clean(row.transaction_date || row.fecha) || null, price_clp: numeric(row.price_clp || row.precio_clp),
          price_uf: priceUf, price_uf_m2: priceUf && area ? priceUf / area : null, description: clean(row.description || row.descripcion) || null,
          tomo: clean(row.tomo) || null, foja: clean(row.foja) || null, numero: clean(row.numero) || null, raw_payload: row,
        }, { onConflict: 'event_key' })
        if (error) throw error
      }
      accepted++
    } catch (error) {
      rejected++
      sampleErrors.push({ row: index + 1, errors: [error instanceof Error ? error.message : 'Error de materialización'] })
    }
  }

  await auth.supabase.from('market_ingestion_runs').update({
    accepted_rows: accepted, rejected_rows: rejected, status: accepted ? 'completed' : 'rejected', completed_at: new Date().toISOString(),
    error_message: rejected ? `${rejected} filas rechazadas` : null,
    metadata: { sourceId: source.id, authorizationConfirmed: true, importedBy: auth.user.id, sampleErrors: sampleErrors.slice(0, 100) },
  }).eq('id', run.id)

  return NextResponse.json({ runId: run.id, sourceId: source.id, received: rows.length, accepted, rejected, sampleErrors: sampleErrors.slice(0, 100) })
}
