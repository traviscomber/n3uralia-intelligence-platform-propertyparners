export const intelligenceTableMap = {
  profiles: 'profiles',
  properties: 'properties',
  sales: 'sales',
  evidence: 'evidence',
  decisions: 'decisions',
  marketSignals: 'market_signals',
} as const

export type IntelligenceTable = keyof typeof intelligenceTableMap

export function getIntelligenceTable(table: IntelligenceTable) {
  return intelligenceTableMap[table]
}

export function mapProductionEntity<T extends Record<string, unknown>>(entity: T) {
  return {
    ...entity,
    normalizedAt: new Date().toISOString(),
  }
}
