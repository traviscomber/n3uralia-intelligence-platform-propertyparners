import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireExecutiveAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

type DatasetKind = 'portal_apartments' | 'portal_houses' | 'portal_projects'

type UnitListingRow = {
  source_listing_id?: string
  property_type?: 'Casa' | 'Departamento' | 'Proyecto' | 'Otro'
  operation?: 'Venta' | 'Arriendo' | 'Sin confirmar'
  status?: 'observed' | 'active' | 'inactive' | 'sold' | 'removed' | 'quarantined'
  url?: string
  title?: string
  raw_address?: string
  normalized_address?: string
  street_name?: string
  street_number?: string
  unit_number?: string
  rol?: string
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

function expectedPropertyType(kind: DatasetKind) {
  if (kind === 'portal_apartments') return 'Departamento'
  if (kind === 'portal_houses') return 'Casa'
  return 'Proyecto'
}

function previewRows(rows: UnitListingRow[], kind: DatasetKind) {
  const expectedType = expectedPropertyType(kind)
  let accepted = 0
  let rejected = 0
  const validation = rows.map((row, index) => {
    const errors: string[] = []
    const sourceListingId = String(row.source_listing_id ?? '').trim()
    const propertyType = String(row.property_type ?? expectedType).trim()
    const operation = String(row.operation ?? 'Sin confirmar').trim()
    const status = String(row.status ?? 'active').trim()
    const hasAddress = Boolean(String(row.normalized_address ?? row.raw_address ?? '').trim())
    const hasCoordinates = row.latitude !== null && row.latitude !== undefined && row.longitude !== null && row.longitude !== undefined

    if (!sourceListingId) errors.push('missing_source_listing_id')
    if (!['Casa', 'Departamento', 'Proyecto', 'Otro'].includes(propertyType)) errors.push('invalid_property_type')
    if (!['Venta', 'Arriendo', 'Sin confirmar'].includes(operation)) errors.push('invalid_operation')
    if (!['observed', 'active', 'inactive', 'sold', 'removed', 'quarantined'].includes(status)) errors.push('invalid_status')
    if (!hasAddress && !hasCoordinates) errors.push('missing_identity_evidence')

    if (errors.length) rejected += 1
    else accepted += 1

    return {
      row: index + 1,
      source_listing_id: sourceListingId || null,
      property_type: propertyType,
      operation,
      status,
      neighborhood: row.neighborhood ?? null,
      address: row.normalized_address ?? row.raw_address ?? null,
      errors,
    }
  })

  return { accepted, rejected, validation }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireExecutiveAccess()
    if (!access.allowed) {
      return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
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

    const preview = previewRows(rows, datasetKind)
    if (body.mode !== 'import') {
      return NextResponse.json({
        mode: 'preview',
        datasetKind,
        source,
        sourceFile,
        observedAt: observedAt.toISOString(),
        summary: { received: rows.length, accepted: preview.accepted, rejected: preview.rejected },
        preview: preview.validation.slice(0, 50),
        message: 'Vista previa lista. No se escribieron datos.',
      })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase.rpc('ingest_market_listings_unit', {
      p_source_label: source,
      p_source_file: sourceFile,
      p_dataset_kind: datasetKind,
      p_observed_at: observedAt.toISOString(),
      p_rows: rows,
    })
    if (error) throw error

    return NextResponse.json({
      mode: 'import',
      datasetKind,
      source,
      sourceFile,
      observedAt: observedAt.toISOString(),
      summary: {
        received: Number(data?.received ?? rows.length),
        accepted: Number(data?.accepted ?? 0),
        rejected: Number(data?.rejected ?? 0),
        newListings: Number(data?.new_listings ?? 0),
        changedListings: Number(data?.changed_listings ?? 0),
        unchangedListings: Number(data?.unchanged_listings ?? 0),
        runId: data?.run_id ?? null,
        sourceId: data?.source_id ?? null,
      },
      message: `Importación unitaria completada: ${Number(data?.accepted ?? 0)} aceptadas y ${Number(data?.rejected ?? 0)} rechazadas.`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No fue posible importar las publicaciones unitarias.' },
      { status: 500 },
    )
  }
}
