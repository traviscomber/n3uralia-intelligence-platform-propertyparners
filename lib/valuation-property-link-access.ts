export type ValuationPropertyLinkScope = 'global' | 'office' | 'self'

export function canLinkValuationProperty(args: {
  scope: ValuationPropertyLinkScope
  scopeTeam: string | null
  territoryOffice: string | null
  hasActiveSelfAssignment: boolean
}) {
  if (args.scope === 'global') return true
  if (args.scope === 'office') {
    return Boolean(args.scopeTeam && args.territoryOffice && args.scopeTeam === args.territoryOffice)
  }
  return args.hasActiveSelfAssignment
}
