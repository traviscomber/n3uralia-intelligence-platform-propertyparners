import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const CANONICAL_SHA256 = 'dd934b080dac2d9555c3dc9654c1226e525377a30f36f1368c52f4d49719cee3'
const CANONICAL_FILE = 'BASE_CBR_CON_BARRIO_ASIGNADO VITACURA.xlsx'

type CanonicalTransaction = {
  event_key: string
  property_type: 'Casa' | 'Departamento'
  transaction_date: string
  foja?: string | null
  numero?: string | null
  tomo?: string | null
  address?: string | null
  rol?: string | null
  price_uf?: number | null
  built_area_m2?: number | null
  land_area_m2?: number | null
  bedrooms_bathrooms?: string | null
  construction_year?: number | null
  latitude?: number | null
  longitude?: number | null
  neighborhood?: string | null
  source_row_number?: number | null
  component_count?: number | null
}

type Payload = { sourceSha256: string; rows: CanonicalTransaction[] }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!['admin', 'ceo'].includes(String(profile?.role ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  let payload: Payload
  try { payload = await request.json() as Payload } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (payload.sourceSha256 !== CANONICAL_SHA256) return NextResponse.json({ error: 'El archivo no coincide con el workbook CBRS canónico aprobado.' }, { status: 409 })
  if (!Array.isArray(payload.rows) || payload.rows.length < 1 || payload.rows.length > 750) return NextResponse.json({ error: 'Cada lote debe contener entre 1 y 750 operaciones.' }, { status: 400 })

  const rows = payload.rows.map((row) => ({
    ...row,
    source_file: CANONICAL_FILE,
    source_sha256: CANONICAL_SHA256,
  }))
  const invalid = rows.find((row) => !row.event_key || !['Casa', 'Departamento'].includes(row.property_type) || !row.transaction_date)
  if (invalid) return NextResponse.json({ error: 'El lote contiene una operación incompleta.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('market_cbrs_reference_transactions').upsert(rows, { onConflict: 'event_key' })
  if (error) {
    console.error('CBRS_CANONICAL_BATCH_IMPORT_FAILED', { code: error.code ?? 'UNKNOWN' })
    return NextResponse.json({ error: 'No fue posible persistir el lote CBRS.' }, { status: 422 })
  }

  const { count } = await admin.from('market_cbrs_reference_transactions').select('id', { count: 'exact', head: true }).eq('source_sha256', CANONICAL_SHA256)
  return NextResponse.json({ imported: rows.length, canonicalRows: count ?? null, sourceSha256: CANONICAL_SHA256 })
}
