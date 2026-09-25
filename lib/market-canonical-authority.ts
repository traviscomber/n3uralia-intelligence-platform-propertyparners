import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'

type CanonicalSourceRow = {
  code: string
  name: string
  file_name: string | null
  file_hash: string | null
  row_count: number | null
  period_start: string | null
  period_end: string | null
  status: string
  metadata: unknown
}

export type CanonicalMarketAuthority = {
  cbrs: {
    workbookRows: number | null
    residentialEvents: number | null
    houses: number | null
    apartments: number | null
    periodStart: string | null
    periodEnd: string | null
    aggregationRule: string | null
    sourceFile: string | null
    sourceHash: string | null
  }
  portalReference: {
    houses: number | null
    apartments: number | null
    projects: number | null
    observedAt: string | null
    sourceFiles: string[]
  }
  territory: {
    neighborhoods: number | null
    sourceFile: string | null
    sourceHash: string | null
  }
}

function numberOrNull(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function metadata(row: { metadata?: unknown } | null | undefined) {
  return row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {}
}

export async function getCanonicalMarketAuthority(): Promise<CanonicalMarketAuthority> {
  const supabase = createServiceClient()
  const codes = [
    'cbrs_vitacura_canonical_2014_2026',
    'portal_canonical_houses_2026_03_09',
    'portal_canonical_departments_2026_03_09',
    'portal_canonical_projects_2026_03_09',
    'kml_vitacura_barrios_2026_08_12',
  ]

  const { data, error } = await supabase
    .from('market_sources')
    .select('code,name,file_name,file_hash,row_count,period_start,period_end,status,metadata')
    .in('code', codes)

  if (error) throw new Error(`CANONICAL_MARKET_AUTHORITY_FAILED:${error.message}`)

  const byCode = new Map<string, CanonicalSourceRow>((data ?? []).map((row) => [row.code, row]))
  const cbrs = byCode.get('cbrs_vitacura_canonical_2014_2026') ?? null
  const kml = byCode.get('kml_vitacura_barrios_2026_08_12') ?? null
  const housePortal = byCode.get('portal_canonical_houses_2026_03_09') ?? null
  const apartmentPortal = byCode.get('portal_canonical_departments_2026_03_09') ?? null
  const projectPortal = byCode.get('portal_canonical_projects_2026_03_09') ?? null

  const cbrsMeta = metadata(cbrs)

  const portalRows = [housePortal, apartmentPortal, projectPortal].filter((row): row is CanonicalSourceRow => Boolean(row))
  const observedAt = portalRows
    .map((row) => row.period_end)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  return {
    cbrs: {
      workbookRows: numberOrNull(cbrs?.row_count),
      residentialEvents: numberOrNull(cbrsMeta.residential_compraventa_events),
      houses: numberOrNull(cbrsMeta.houses),
      apartments: numberOrNull(cbrsMeta.departments),
      periodStart: cbrs?.period_start ?? null,
      periodEnd: cbrs?.period_end ?? null,
      aggregationRule: typeof cbrsMeta.aggregation_rule === 'string' ? cbrsMeta.aggregation_rule : null,
      sourceFile: cbrs?.file_name ?? null,
      sourceHash: cbrs?.file_hash ?? null,
    },
    portalReference: {
      houses: numberOrNull(metadata(housePortal).valid_listing_rows ?? housePortal?.row_count),
      apartments: numberOrNull(metadata(apartmentPortal).valid_listing_rows ?? apartmentPortal?.row_count),
      projects: numberOrNull(metadata(projectPortal).valid_listing_rows ?? projectPortal?.row_count),
      observedAt,
      sourceFiles: portalRows.map((row) => row.file_name).filter((value): value is string => Boolean(value)),
    },
    territory: {
      neighborhoods: numberOrNull(kml?.row_count),
      sourceFile: kml?.file_name ?? null,
      sourceHash: kml?.file_hash ?? null,
    },
  }
}
