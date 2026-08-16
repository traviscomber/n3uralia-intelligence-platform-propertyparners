export type LookupPropertyType = 'Casa' | 'Departamento'

export type CbrsSubjectLookupRow = {
  event_key: string
  property_type: string | null
  transaction_date: string
  address: string | null
  rol: string | null
  price_uf: number | string | null
  built_area_m2: number | string | null
  land_area_m2: number | string | null
  bedrooms_bathrooms: string | null
  construction_year: number | null
  latitude: number | string | null
  longitude: number | string | null
  neighborhood: string | null
}

export type OperationalPropertyLookupRow = {
  id: string
  property_type: string | null
  normalized_address: string | null
  street_name: string | null
  street_number: string | null
  unit_number: string | null
  rol: string | null
  latitude: number | string | null
  longitude: number | string | null
  land_area_m2: number | string | null
  built_area_m2: number | string | null
  useful_area_m2: number | string | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  construction_year: number | null
  identity_status: string | null
  identity_confidence: number | string | null
  market_neighborhoods?: Array<{ name: string | null }>
}

export type SubjectLookupUnit = {
  unit: string
  address: string
  rol?: string
  registeredAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  lastTransactionDate: string
}

export type SubjectLookupHistory = {
  eventKey: string
  transactionDate: string
  priceUf?: number
  rol?: string
  registeredAreaM2?: number
}

export type ResolvedSubjectLookup = {
  status: 'resolved'
  subject: {
    propertyType: LookupPropertyType
    address: string
    neighborhood: string
    rol: string
    latitude?: number
    longitude?: number
    usefulAreaM2?: number
    builtAreaM2?: number
    landAreaM2?: number
    bedrooms?: number
    bathrooms?: number
    parkingSpaces?: number
    constructionYear?: number
  }
  unit?: string
  registeredAreaM2?: number
  areaSemantics?: 'cbrs_registered_area_not_confirmed_as_useful' | 'operational_useful_area'
  sourceEventKey: string
  sourceTransactionDate: string
  sourcePriceUf?: number
  canonicalPropertyId?: string
  history: SubjectLookupHistory[]
  provenance: Record<string, 'CBRS' | 'Identidad canónica'>
}

export type SubjectLookupResult =
  | ResolvedSubjectLookup
  | { status: 'units'; buildingAddress: string; units: SubjectLookupUnit[] }
  | { status: 'not_found'; message: string }

export function normalizeValuationAddress(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function nullableNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function parseBedroomsBathrooms(value: unknown) {
  const match = String(value ?? '').match(/(\d+)\s*D\s*\/\s*(\d+)\s*B/i)
  if (!match) return { bedrooms: undefined, bathrooms: undefined }
  return { bedrooms: Number(match[1]), bathrooms: Number(match[2]) }
}

export function extractUnitNumber(value: unknown) {
  const normalized = normalizeValuationAddress(value)
  const match = normalized.match(/\b(?:DP|DEPTO|DEPARTAMENTO)\s+([A-Z0-9-]+)\b/)
  return match?.[1] || undefined
}

export function parseAddressLookup(value: unknown) {
  let normalized = normalizeValuationAddress(value)
  const unit = extractUnitNumber(normalized)
  if (unit) normalized = normalized.replace(/\s+(?:DP|DEPTO|DEPARTAMENTO)\s+[A-Z0-9-]+.*$/, '').trim()
  const match = normalized.match(/^(.+?)\s+(\d+[A-Z]?)$/)
  if (!match) return null
  return {
    streetName: match[1].trim(),
    streetNumber: match[2],
    buildingAddress: `${match[1].trim()} ${match[2]}`,
    unit,
  }
}

function asPropertyType(value: unknown): LookupPropertyType {
  return normalizeValuationAddress(value).includes('CASA') ? 'Casa' : 'Departamento'
}

function sortRowsNewestFirst(rows: CbrsSubjectLookupRow[]) {
  return [...rows].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
}

function sameUnit(row: CbrsSubjectLookupRow, requestedUnit: string) {
  const unit = extractUnitNumber(row.address)
  return unit === normalizeValuationAddress(requestedUnit)
}

export function listBuildingUnits(rows: CbrsSubjectLookupRow[]): SubjectLookupUnit[] {
  const latestByUnit = new Map<string, CbrsSubjectLookupRow>()
  for (const row of sortRowsNewestFirst(rows)) {
    const unit = extractUnitNumber(row.address)
    if (!unit || latestByUnit.has(unit)) continue
    latestByUnit.set(unit, row)
  }

  return [...latestByUnit.entries()]
    .map(([unit, row]) => {
      const program = parseBedroomsBathrooms(row.bedrooms_bathrooms)
      return {
        unit,
        address: row.address || '',
        rol: row.rol || undefined,
        registeredAreaM2: nullableNumber(row.built_area_m2),
        bedrooms: program.bedrooms,
        bathrooms: program.bathrooms,
        lastTransactionDate: row.transaction_date,
      }
    })
    .sort((a, b) => a.unit.localeCompare(b.unit, 'es', { numeric: true }))
}

function matchOperationalProperty(
  operationalRows: OperationalPropertyLookupRow[],
  buildingAddress: string,
  unit: string | undefined,
) {
  const normalizedBuilding = normalizeValuationAddress(buildingAddress)
  return operationalRows.find((row) => {
    const rowBuilding = normalizeValuationAddress(`${row.street_name ?? ''} ${row.street_number ?? ''}`)
    if (rowBuilding !== normalizedBuilding) return false
    const rowUnit = normalizeValuationAddress(row.unit_number)
    return unit ? rowUnit === normalizeValuationAddress(unit) : !rowUnit
  })
}

export function resolveCbrsSubjectRows(
  rows: CbrsSubjectLookupRow[],
  requestedUnit?: string,
  operationalRows: OperationalPropertyLookupRow[] = [],
): SubjectLookupResult {
  if (!rows.length) return { status: 'not_found', message: 'No encontramos la dirección en la capa canónica.' }

  const newestRows = sortRowsNewestFirst(rows)
  const first = newestRows[0]
  const propertyType = asPropertyType(first.property_type)
  const parsedAddress = parseAddressLookup((first.address || '').replace(/\s+(?:DP|DEPTO|DEPARTAMENTO)\s+[A-Z0-9-]+.*$/i, ''))
  const buildingAddress = parsedAddress?.buildingAddress || normalizeValuationAddress(first.address)

  if (propertyType === 'Departamento' && !requestedUnit) {
    const units = listBuildingUnits(rows)
    if (units.length > 1) return { status: 'units', buildingAddress, units }
    if (units.length === 1) requestedUnit = units[0].unit
  }

  const subjectRows = propertyType === 'Departamento' && requestedUnit
    ? newestRows.filter((row) => sameUnit(row, requestedUnit as string))
    : newestRows.filter((row) => !extractUnitNumber(row.address))

  if (!subjectRows.length) {
    return {
      status: 'not_found',
      message: propertyType === 'Departamento'
        ? `No encontramos el departamento ${normalizeValuationAddress(requestedUnit)} en ${buildingAddress}.`
        : `No encontramos una propiedad canónica para ${buildingAddress}.`,
    }
  }

  const canonical = subjectRows[0]
  const unit = extractUnitNumber(canonical.address)
  const operational = matchOperationalProperty(operationalRows, buildingAddress, unit)
  const program = parseBedroomsBathrooms(canonical.bedrooms_bathrooms)
  const canonicalNeighborhood = operational?.market_neighborhoods?.[0]?.name || canonical.neighborhood || ''
  const cbrsArea = nullableNumber(canonical.built_area_m2)
  const operationalUseful = nullableNumber(operational?.useful_area_m2)
  const propertyTypeResolved = asPropertyType(operational?.property_type || canonical.property_type)

  const subject: ResolvedSubjectLookup['subject'] = {
    propertyType: propertyTypeResolved,
    address: operational?.normalized_address || canonical.address || buildingAddress,
    neighborhood: canonicalNeighborhood,
    rol: operational?.rol || canonical.rol || '',
    latitude: nullableNumber(operational?.latitude) ?? nullableNumber(canonical.latitude),
    longitude: nullableNumber(operational?.longitude) ?? nullableNumber(canonical.longitude),
    bedrooms: operational?.bedrooms ?? program.bedrooms,
    bathrooms: operational?.bathrooms ?? program.bathrooms,
    parkingSpaces: operational?.parking_spaces ?? undefined,
    constructionYear: operational?.construction_year ?? canonical.construction_year ?? undefined,
  }

  const provenance: ResolvedSubjectLookup['provenance'] = {
    address: operational?.normalized_address ? 'Identidad canónica' : 'CBRS',
    neighborhood: operational?.market_neighborhoods?.[0]?.name ? 'Identidad canónica' : 'CBRS',
    rol: operational?.rol ? 'Identidad canónica' : 'CBRS',
    latitude: operational?.latitude != null ? 'Identidad canónica' : 'CBRS',
    longitude: operational?.longitude != null ? 'Identidad canónica' : 'CBRS',
    bedrooms: operational?.bedrooms != null ? 'Identidad canónica' : 'CBRS',
    bathrooms: operational?.bathrooms != null ? 'Identidad canónica' : 'CBRS',
    constructionYear: operational?.construction_year != null ? 'Identidad canónica' : 'CBRS',
  }

  let areaSemantics: ResolvedSubjectLookup['areaSemantics']
  if (propertyTypeResolved === 'Casa') {
    subject.builtAreaM2 = nullableNumber(operational?.built_area_m2) ?? cbrsArea
    subject.landAreaM2 = nullableNumber(operational?.land_area_m2) ?? nullableNumber(canonical.land_area_m2)
    provenance.builtAreaM2 = operational?.built_area_m2 != null ? 'Identidad canónica' : 'CBRS'
    provenance.landAreaM2 = operational?.land_area_m2 != null ? 'Identidad canónica' : 'CBRS'
  } else if (operationalUseful !== undefined) {
    subject.usefulAreaM2 = operationalUseful
    areaSemantics = 'operational_useful_area'
    provenance.usefulAreaM2 = 'Identidad canónica'
  } else {
    areaSemantics = 'cbrs_registered_area_not_confirmed_as_useful'
  }

  if (operational?.parking_spaces != null) provenance.parkingSpaces = 'Identidad canónica'

  return {
    status: 'resolved',
    subject,
    unit,
    registeredAreaM2: cbrsArea,
    areaSemantics,
    sourceEventKey: canonical.event_key,
    sourceTransactionDate: canonical.transaction_date,
    sourcePriceUf: nullableNumber(canonical.price_uf),
    canonicalPropertyId: operational?.id,
    history: subjectRows.map((row) => ({
      eventKey: row.event_key,
      transactionDate: row.transaction_date,
      priceUf: nullableNumber(row.price_uf),
      rol: row.rol || undefined,
      registeredAreaM2: nullableNumber(row.built_area_m2),
    })),
    provenance,
  }
}
