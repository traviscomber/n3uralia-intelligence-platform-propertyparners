import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  normalizeValuationAddress,
  parseAddressLookup,
  resolveCbrsSubjectRows,
  type CbrsSubjectLookupRow,
  type OperationalPropertyLookupRow,
} from '@/lib/valuation-subject-lookup'

type LookupPayload = {
  address?: string
  unit?: string
}

export async function POST(request: Request) {
  try {
    await requireAnyCapability([
      'valuations.global.read',
      'valuations.office.read',
      'valuations.self.read',
      'valuations.self.create',
      'valuations.office.review',
      'valuations.global.approve',
    ])

    let payload: LookupPayload
    try {
      payload = await request.json() as LookupPayload
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
    }

    const parsed = parseAddressLookup(payload.address)
    if (!parsed) {
      return NextResponse.json({ error: 'Ingresa calle y número, por ejemplo: Las Nieves 3850.' }, { status: 400 })
    }

    const requestedUnit = normalizeValuationAddress(payload.unit || parsed.unit) || undefined
    const admin = createAdminClient()

    const { data: cbrsRows, error: cbrsError } = await admin
      .from('market_cbrs_reference_transactions')
      .select('event_key,property_type,transaction_date,address,rol,price_uf,built_area_m2,land_area_m2,bedrooms_bathrooms,construction_year,latitude,longitude,neighborhood')
      .ilike('address', `${parsed.buildingAddress}%`)
      .order('transaction_date', { ascending: false })
      .limit(200)

    if (cbrsError) {
      console.error('VALUATION_SUBJECT_LOOKUP_CBRS_FAILED', { code: cbrsError.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible consultar la identidad canónica de la propiedad.' }, { status: 500 })
    }

    const exactBuildingRows = ((cbrsRows ?? []) as unknown as CbrsSubjectLookupRow[])
      .filter((row) => {
        const normalized = normalizeValuationAddress(row.address)
        return normalized === parsed.buildingAddress || normalized.startsWith(`${parsed.buildingAddress} `)
      })

    if (!exactBuildingRows.length) {
      return NextResponse.json({ status: 'not_found', message: 'No encontramos la dirección en la capa canónica.' }, { status: 404 })
    }

    const { data: operationalRows, error: operationalError } = await admin
      .from('market_properties')
      .select('id,property_type,normalized_address,street_name,street_number,unit_number,rol,latitude,longitude,land_area_m2,built_area_m2,useful_area_m2,bedrooms,bathrooms,parking_spaces,construction_year,identity_status,identity_confidence,market_neighborhoods(name)')
      .eq('street_number', parsed.streetNumber)
      .limit(200)

    if (operationalError) {
      console.error('VALUATION_SUBJECT_LOOKUP_OPERATIONAL_UNAVAILABLE', { code: operationalError.code ?? 'UNKNOWN' })
    }

    const resolution = resolveCbrsSubjectRows(
      exactBuildingRows,
      requestedUnit,
      (operationalRows ?? []) as unknown as OperationalPropertyLookupRow[],
    )

    if (resolution.status === 'not_found') {
      return NextResponse.json(resolution, { status: 404 })
    }

    return NextResponse.json(resolution)
  } catch (error) {
    return accessErrorResponse(error)
  }
}
