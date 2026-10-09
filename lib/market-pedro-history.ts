export type CbrsPropertyType = 'Casa' | 'Departamento'
export type CbrsAnnualInput = {
  year: number
  property_type: string
  transactions: number | string | null
  median_price_uf: number | string | null
  median_uf_m2: number | string | null
}
export type AnnualCbrsMeasure = {
  year: number
  propertyType: CbrsPropertyType
  transactions: number | null
  medianPriceUf: number | null
  medianUfM2: number | null
}

function finiteNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : null
}

/** Uses persisted, event-deduplicated CBRS rows; never counts raw deed components. */
export function canonicalCbrsHistory(rows: readonly CbrsAnnualInput[], lastCompleteYear: number): AnnualCbrsMeasure[] {
  const values = new Map<string, AnnualCbrsMeasure>()
  for (const row of rows) {
    if ((row.property_type !== 'Casa' && row.property_type !== 'Departamento')
      || !Number.isInteger(row.year)
      || row.year < lastCompleteYear - 3 || row.year > lastCompleteYear) continue
    const item: AnnualCbrsMeasure = {
      year: row.year,
      propertyType: row.property_type,
      transactions: finiteNumber(row.transactions),
      medianPriceUf: finiteNumber(row.median_price_uf),
      medianUfM2: finiteNumber(row.median_uf_m2),
    }
    const key = row.property_type + ':' + row.year
    const previous = values.get(key)
    if (previous && JSON.stringify(previous) !== JSON.stringify(item)) {
      throw new Error('CONFLICTING_CANONICAL_CBRS_YEAR:' + key)
    }
    values.set(key, item)
  }

  const history: AnnualCbrsMeasure[] = []
  for (const type of ['Casa', 'Departamento'] as const) {
    for (let year = lastCompleteYear - 3; year <= lastCompleteYear; year++) {
      history.push(values.get(type + ':' + year) ?? {
        year,
        propertyType: type,
        transactions: null,
        medianPriceUf: null,
        medianUfM2: null,
      })
    }
  }
  return history
}

export function verifiableChange(current: number | null, previous: number | null): number | null {
  return current !== null && previous !== null && previous > 0 ? current / previous - 1 : null
}
