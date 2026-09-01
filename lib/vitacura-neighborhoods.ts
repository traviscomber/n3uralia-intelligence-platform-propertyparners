import { createClient } from '@/lib/supabase/server'

const KML_SOURCE_CODE = 'kml_vitacura_barrios_2026_08_12'

export type VitacuraNeighborhoodCoverageRow = {
  name: string
  partners: string[]
  properties: number
}

export type VitacuraNeighborhoodSnapshot = {
  sourceCode: string
  sourceFile: string | null
  sourceHash: string | null
  importedAt: string | null
  polygons: number
  assignedProperties: number
  neighborhoods: VitacuraNeighborhoodCoverageRow[]
  error?: string
}

type NeighborhoodPropertyCount = {
  neighborhood_id: string
  property_count: number
}

const emptySnapshot: VitacuraNeighborhoodSnapshot = {
  sourceCode: KML_SOURCE_CODE,
  sourceFile: null,
  sourceHash: null,
  importedAt: null,
  polygons: 0,
  assignedProperties: 0,
  neighborhoods: [],
}

function normalizePartners(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const partners = (value as { partners?: unknown }).partners
  if (!Array.isArray(partners)) return []

  const normalized = partners
    .map((partner) => typeof partner === 'string' ? partner.trim() : '')
    .filter(Boolean)
    .map((partner) => partner === 'María paz Larraín' ? 'María Paz Larraín' : partner)

  return [...new Set(normalized)]
}

export async function getVitacuraNeighborhoodSnapshot(): Promise<VitacuraNeighborhoodSnapshot> {
  try {
    const supabase = await createClient()
    const source = await supabase
      .from('market_sources')
      .select('id,code,file_name,file_hash,imported_at')
      .eq('code', KML_SOURCE_CODE)
      .maybeSingle()

    if (source.error) return { ...emptySnapshot, error: source.error.message }
    if (!source.data) return emptySnapshot

    const [territories, canonicalNeighborhoods, propertyCounts] = await Promise.all([
      supabase
        .from('vitacura_market_neighborhoods')
        .select('barrio_nombre,raw_properties')
        .eq('fuente', 'Property Partners')
        .eq('version', '2026-08-12'),
      supabase
        .from('market_neighborhoods')
        .select('id,name,micro_neighborhood')
        .eq('geometry_source_id', source.data.id),
      supabase.rpc('get_vitacura_neighborhood_property_counts_v1'),
    ])

    const firstError = territories.error || canonicalNeighborhoods.error || propertyCounts.error
    if (firstError) return { ...emptySnapshot, error: firstError.message }

    const countByNeighborhood = new Map<string, number>()
    for (const row of (propertyCounts.data ?? []) as NeighborhoodPropertyCount[]) {
      countByNeighborhood.set(row.neighborhood_id, Number(row.property_count ?? 0))
    }

    const territoryByName = new Map(
      (territories.data ?? []).map((row) => [
        row.barrio_nombre === 'Alonso de Córdova' ? 'Alonso de Cordova' : row.barrio_nombre,
        row,
      ]),
    )

    const neighborhoods = (canonicalNeighborhoods.data ?? [])
      .map((row) => {
        const territory = territoryByName.get(row.name)
        return {
          name: row.micro_neighborhood || row.name,
          partners: normalizePartners(territory?.raw_properties),
          properties: countByNeighborhood.get(row.id) ?? 0,
        }
      })
      .sort((a, b) => b.properties - a.properties || a.name.localeCompare(b.name, 'es'))

    return {
      sourceCode: source.data.code,
      sourceFile: source.data.file_name,
      sourceHash: source.data.file_hash,
      importedAt: source.data.imported_at,
      polygons: neighborhoods.length,
      assignedProperties: neighborhoods.reduce((total, row) => total + row.properties, 0),
      neighborhoods,
    }
  } catch (error) {
    return {
      ...emptySnapshot,
      error: error instanceof Error ? error.message : 'No fue posible consultar la capa territorial de Vitacura.',
    }
  }
}
