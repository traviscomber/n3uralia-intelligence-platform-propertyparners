export type UnitDirectorInsight = {
  unitId: string
  performance: string[]
  opportunities: string[]
  risks: string[]
  actions: string[]
}

export function generateUnitDirectorInsight(input: {
  unitId: string
  performance: string[]
  opportunities: string[]
  risks: string[]
}): UnitDirectorInsight {
  return {
    unitId: input.unitId,
    performance: input.performance,
    opportunities: input.opportunities,
    risks: input.risks,
    actions: [
      'Review unit performance.',
      'Prioritize strategic opportunities.',
      'Monitor operational risks.',
    ],
  }
}
