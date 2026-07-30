import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireExecutiveAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

type DatasetKind = 'portal_apartments' | 'portal_houses' | 'portal_projects'

type UnitListingRow = {
  source_listing_id?: string
  mlc_id?: string
  id?: string
  property_type?: string
  operation?: string
  operacion?: string
  status?: string
  url?: string
  title?: string
  address?: string
  direccion?: string
  normalized_address?: string
  neighborhood?: string
  latitude?: number | string | null
  longitude?: number | string | null
  price_clp?: number | string | null
  price_uf?: number | string | null
  price_uf_m2?: number | string | null
  published_at?: string | null
  land_area_m2?: number | string | null
  built_area_m2?: number | string | null
  useful_area_m2?: number | string | null
  bedrooms?: number | string | null
  bathrooms?: number | string | null
  parking_spaces?: number | string | null
  construction_year?: number | string | null
  [key: string]: unknown
}

type Body = {
  source?: string
  source_file?: string
  dataset_kind?: string
  observed_at?: string
  full_snapshot?: boolean
  mode?: 'preview' | 'import'
  rows?: UnitListingRow[]
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials')
  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function parseDatasetKind(value: string | undefined): DatasetKind | null {
  if (value === 'portal_apartments' || value === 'portal_houses' || value === 'portal_projects') return value
  return null
}

function sourceListingId(row: UnitListingRow) {
  return String(row.source_listing_id ?? row.mlc_id ?? row.id ?? '').trim()
}

function previewRows(rows: UnitListingRow[]) {
  const seen = new Set<string>()
  let accepted = 0
  let rejected = 0

  const validation = rows.map((row, index) => {
    const errors: string[] = []
    const id = sourceListingId(row)

    if (!id) errors.push('missing_source_listing_id')
    else if (seen.has(id)) errors.push('duplicate_source_listing_id_in_run')
    else seen.add(id)

    const latitude = row.latitude == null || row.latitude === '' ? null : Number(row.latitude)
    const longitude = row.longitude == null || row.longitude === '' ? null : Number(row.longitude)
    const priceUf = row.price_uf == null || row.price_uf === '' ? null : Number(row.price_uf)

    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) errors.push('invalid_latitude')
    if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) errors.push('invalid_longitude')
    if (priceUf !== null && (!Number.isFinite(priceUf) || priceUf < 0)) errors.push('invalid_price')

    if (errors.length) rejected += 1
    else accepted += 1

    return {
      row: index + 1,
      source_listing_id: id || null,
      property_type: row.property_type ?? null,
      operation: row.operation ?? row.operacion ?? null,
      status: row.status ?? 'active',
      neighborhood: row.neighborhood ?? null,
      address: row.normalized_address ?? row.address ?? row.direccion ?? null,
      price_uf: row.price_uf ?? null,
      errors,
    }
  })

  return { accepted, rejected, validation }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireExecutiveAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: 'Acceso restringido a roles ejecutivos autorizados.' }, { status: access.status })
    }

    const body = (await request.json().catch(() => null)) as Body | null
    if (!body) return NextResponse.json({ error: 'Se requiere un cuerpo JSON válido.' }, { status: 400 })

    const datasetKind = parseDatasetKind(body.dataset_kind)
    if (!datasetKind) {
      return NextResponse.json({ error: 'dataset_kind debe ser portal_apartments, portal_houses o portal_projects.' }, { status: 400 })
    }

    const rows = Array.isArray(body.rows) ? body.rows : []
    if (!rows.length) return NextResponse.json({ error: 'No se recibieron publicaciones.' }, { status: 400 })
    if (rows.length > 10_000) return NextResponse.json({ error: 'El máximo por ejecución es 10.000 filas.' }, { status: 413 })

    const source = String(body.source ?? 'portal_unit_import').trim() || 'portal_unit_import'
    const sourceFile = String(body.source_file ?? 'payload.json').trim() || 'payload.json'
    const observedAt = body.observed_at ? new Date(body.observed_at) : new Date()
    if (Number.isNaN(observedAt.getTime())) return NextResponse.json({ error: 'observed_at no es una fecha válida.' }, { status: 400 })

    const preview = previewRows(rows)
    if (body.mode !== 'import') {
      return NextResponse.json({
        mode: 'preview',
        datasetKind,
        source,
        sourceFile,
        observedAt: observedAt.toISOString(),
        fullSnapshot: Boolean(body.full_snapshot),
        summary: { received: rows.length, accepted: preview.accepted, rejected: preview.rejected },
        preview: preview.validation.slice(0, 50),
        message: 'Vista previa lista. No se escribieron datos.',
      })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase.rpc('ingest_portal_listing_snapshot', {
      p_source_label: source,
      p_source_file: sourceFile,
      p_dataset_kind: datasetKind,
      p_observed_at: observedAt.toISOString(),
      p_rows: rows,
      p_full_snapshot: Boolean(body.full_snapshot),
    })
    if (error) throw error

    return NextResponse.json({
      mode: 'import',
      datasetKind,
      source,
      sourceFile,
      observedAt: observedAt.toISOString(),
      fullSnapshot: Boolean(body.full_snapshot),
      summary: {
        received: Number(data?.received ?? rows.length),
        accepted: Number(data?.accepted ?? 0),
        rejected: Number(data?.rejected ?? 0),
        newListings: Number(data?.new ?? 0),
        changedListings: Number(data?.updated ?? 0),
        unchangedListings: Number(data?.unchanged ?? 0),
        removedListings: Number(data?.removed ?? 0),
        runId: data?.run_id ?? null,
        sourceId: data?.source_id ?? null,
      },
      message: `Importación unitaria completada: ${Number(data?.accepted ?? 0)} aceptadas, ${Number(data?.rejected ?? 0)} rechazadas y ${Number(data?.removed ?? 0)} retiradas.`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No fue posible importar las publicaciones unitarias.' },
      { status: 500 },
    )
  }
}
