import { NextResponse } from 'next/server'
import { normalizeMarketProperty, type MarketPropertyInput } from '@/lib/market-normalization'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type ImportPayload = {
  source: {
    code: string
    name: string
    sourceType: 'portal' | 'cbrs' | 'kml' | 'client' | 'other'
    fileName?: string
    fileHash?: string
    periodStart?: string
    periodEnd?: string
  }
  rows: MarketPropertyInput[]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!['admin', 'ceo'].includes(String(profile?.role ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  let payload: ImportPayload
  try {
    payload = await request.json() as ImportPayload
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!payload.source?.code || !payload.source?.name || !payload.source?.sourceType || !Array.isArray(payload.rows)) {
    return NextResponse.json({ error: 'Fuente y filas son obligatorias' }, { status: 400 })
  }
  if (payload.rows.length > 10000) {
    return NextResponse.json({ error: 'Máximo 10.000 filas por solicitud' }, { status: 413 })
  }

  // Authorization is evaluated with the user's session above. Canonical market
  // writes then cross the privileged server boundary so browser roles never need
  // mutation grants on shared market intelligence tables.
  const admin = createAdminClient()
  const { data: source, error: sourceError } = await admin
    .from('market_sources')
    .upsert({
      code: payload.source.code,
      name: payload.source.name,
      source_type: payload.source.sourceType,
      file_name: payload.source.fileName ?? null,
      file_hash: payload.source.fileHash ?? null,
      period_start: payload.source.periodStart ?? null,
      period_end: payload.source.periodEnd ?? null,
      row_count: payload.rows.length,
      status: 'active',
    }, { onConflict: 'code' })
    .select('id')
    .single()

  if (sourceError || !source) {
    console.error('MARKET_CANONICAL_SOURCE_UPSERT_FAILED', { code: sourceError?.code ?? 'UNKNOWN' })
    return NextResponse.json({ error: 'No fue posible registrar la fuente.' }, { status: 500 })
  }

  const normalizedRows = payload.rows.map(normalizeMarketProperty)
  const propertyRows = normalizedRows.map((row) => ({
    canonical_key: row.canonicalKey,
    property_type: row.propertyType,
    normalized_address: row.normalizedAddress,
    street_name: row.streetName,
    street_number: row.streetNumber,
    unit_number: row.unitNumber,
    rol: row.rol,
    latitude: row.latitude,
    longitude: row.longitude,
    land_area_m2: row.landAreaM2,
    built_area_m2: row.builtAreaM2,
    useful_area_m2: row.usefulAreaM2,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking_spaces: row.parkingSpaces,
    construction_year: row.constructionYear,
    identity_status: row.identityStatus,
    identity_confidence: row.identityConfidence,
    identity_evidence: row.identityEvidence,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }))

  const { error: propertyError } = await admin
    .from('market_properties')
    .upsert(propertyRows, { onConflict: 'canonical_key', ignoreDuplicates: false })

  if (propertyError) {
    await admin.from('market_sources').update({ status: 'quarantined', metadata: { importErrorCode: propertyError.code ?? 'UNKNOWN' } }).eq('id', source.id)
    console.error('MARKET_CANONICAL_PROPERTY_UPSERT_FAILED', { code: propertyError.code ?? 'UNKNOWN' })
    return NextResponse.json({ error: 'No fue posible importar las propiedades canónicas.' }, { status: 422 })
  }

  const candidates = normalizedRows.filter((row) => row.identityStatus === 'candidate').length
  return NextResponse.json({
    sourceId: source.id,
    imported: normalizedRows.length,
    candidates,
    needsReview: normalizedRows.length - candidates,
  })
}
