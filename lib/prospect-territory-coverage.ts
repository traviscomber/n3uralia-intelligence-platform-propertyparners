export type ProspectCoverageProperty = {
  id: string
  neighborhood_id: string | null
}

export type ProspectCoverageLead = {
  property_id: string
  neighborhood_id: string
  director_key: string
}

export type ProspectCoverageTerritory = {
  neighborhood_id: string
  group_key: string
  group_name: string
  director_key: string
}

export type ProspectCoverageNeighborhood = {
  id: string
  name: string
  micro_neighborhood?: string | null
}

export type ProspectCoverageDirector = {
  director_key: string
  full_name: string
  office_name: string
}

export type ProspectTerritoryCoverageRow = {
  neighborhood: ProspectCoverageNeighborhood
  eligiblePublished: number
  leads: number
  unconverted: number
  director: ProspectCoverageDirector | null
  territory: ProspectCoverageTerritory | null
  representativePropertyId: string | null
  needsGroup: boolean
  directorDriftLeads: number
}

export function buildProspectTerritoryCoverage(args: {
  eligibleProperties: ProspectCoverageProperty[]
  leads: ProspectCoverageLead[]
  territories: ProspectCoverageTerritory[]
  neighborhoods: ProspectCoverageNeighborhood[]
  directors: ProspectCoverageDirector[]
}) {
  const neighborhoodById = new Map(args.neighborhoods.map((item) => [item.id, item]))
  const territoryByNeighborhood = new Map(args.territories.map((item) => [item.neighborhood_id, item]))
  const directorByKey = new Map(args.directors.map((item) => [item.director_key, item]))
  const propertiesByNeighborhood = new Map<string, Set<string>>()

  for (const property of args.eligibleProperties) {
    if (!property.neighborhood_id) continue
    const ids = propertiesByNeighborhood.get(property.neighborhood_id) ?? new Set<string>()
    ids.add(property.id)
    propertiesByNeighborhood.set(property.neighborhood_id, ids)
  }

  const rows: ProspectTerritoryCoverageRow[] = []

  for (const [neighborhoodId, propertyIds] of propertiesByNeighborhood.entries()) {
    const neighborhood = neighborhoodById.get(neighborhoodId)
    if (!neighborhood) continue
    const territory = territoryByNeighborhood.get(neighborhoodId) ?? null
    const director = territory ? directorByKey.get(territory.director_key) ?? null : null
    const leads = args.leads.filter((lead) => lead.neighborhood_id === neighborhoodId)
    const leadPropertyIds = new Set(leads.map((lead) => lead.property_id))
    const unconverted = [...propertyIds].filter((id) => !leadPropertyIds.has(id)).length
    const directorDriftLeads = territory
      ? leads.filter((lead) => lead.director_key !== territory.director_key).length
      : 0

    rows.push({
      neighborhood,
      eligiblePublished: propertyIds.size,
      leads: leads.length,
      unconverted,
      director,
      territory,
      representativePropertyId: [...propertyIds][0] ?? null,
      needsGroup: !territory,
      directorDriftLeads,
    })
  }

  rows.sort((left, right) =>
    right.eligiblePublished - left.eligiblePublished
      || left.neighborhood.name.localeCompare(right.neighborhood.name, 'es'),
  )

  const mappedNeighborhoods = rows.filter((row) => !row.needsGroup).length
  const eligiblePublished = rows.reduce((sum, row) => sum + row.eligiblePublished, 0)
  const uncoveredPublished = rows
    .filter((row) => row.needsGroup)
    .reduce((sum, row) => sum + row.eligiblePublished, 0)
  const directorDriftLeads = rows.reduce((sum, row) => sum + row.directorDriftLeads, 0)

  return {
    rows,
    summary: {
      neighborhoods: rows.length,
      mappedNeighborhoods,
      unmappedNeighborhoods: rows.length - mappedNeighborhoods,
      coveragePct: rows.length ? Number((mappedNeighborhoods / rows.length * 100).toFixed(1)) : null,
      eligiblePublished,
      uncoveredPublished,
      directorDriftLeads,
    },
  }
}
