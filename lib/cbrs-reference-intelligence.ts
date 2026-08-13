import { createClient } from '@/lib/supabase/server'

export type CbrsReferenceMetric = {
  propertyType: 'Departamento' | 'Casa'
  scope: 'global' | 'year'
  year: number | null
  transactions: number
  medianPriceUf: number | null
  medianUfM2: number | null
  medianAreaM2: number | null
  newTransactions: number
  usedTransactions: number
  geoOk: number
}

export type CbrsReferenceSnapshot = {
  connected: boolean
  global: CbrsReferenceMetric[]
  yearly: CbrsReferenceMetric[]
  error?: string
}

export async function getCbrsReferenceSnapshot(): Promise<CbrsReferenceSnapshot> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_cbrs_reference_metrics')
      .select('scope,property_type,year,transactions,median_price_uf,median_uf_m2,median_area_m2,new_transactions,used_transactions,geo_ok')
      .in('scope', ['global', 'year'])
      .order('year', { ascending: true })

    if (error) return { connected: false, global: [], yearly: [], error: error.message }

    const metrics: CbrsReferenceMetric[] = (data ?? []).flatMap((row) => {
      if (row.property_type !== 'Departamento' && row.property_type !== 'Casa') return []
      if (row.scope !== 'global' && row.scope !== 'year') return []
      return [{
        propertyType: row.property_type,
        scope: row.scope,
        year: row.year == null ? null : Number(row.year),
        transactions: Number(row.transactions ?? 0),
        medianPriceUf: row.median_price_uf == null ? null : Number(row.median_price_uf),
        medianUfM2: row.median_uf_m2 == null ? null : Number(row.median_uf_m2),
        medianAreaM2: row.median_area_m2 == null ? null : Number(row.median_area_m2),
        newTransactions: Number(row.new_transactions ?? 0),
        usedTransactions: Number(row.used_transactions ?? 0),
        geoOk: Number(row.geo_ok ?? 0),
      }]
    })

    return {
      connected: true,
      global: metrics.filter((row) => row.scope === 'global'),
      yearly: metrics.filter((row) => row.scope === 'year'),
    }
  } catch (error) {
    return {
      connected: false,
      global: [],
      yearly: [],
      error: error instanceof Error ? error.message : 'No fue posible consultar la referencia CBRS.',
    }
  }
}
