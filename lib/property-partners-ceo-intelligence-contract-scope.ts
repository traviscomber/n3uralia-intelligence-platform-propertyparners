import 'server-only'
import { buildLatestCeoIntelligenceInput } from '@/lib/property-partners-ceo-intelligence-snapshot'
import {
  generateCeoIntelligenceReport,
  type CanonicalCeoIntelligenceInput,
  type PropertyPartnersCeoIntelligenceReport,
} from '@/lib/property-partners-ceo-intelligence-report'

export const PROPERTY_PARTNERS_HOUSE_SCOPE_TAG = 'scope-casas-vitacura-v1'
export const PROPERTY_PARTNERS_HOUSE_SCOPE_EVIDENCE_ID = 'contract:scope:casas-vitacura:v1'

const OUT_OF_SCOPE_PATTERN = /departament|arriendo|renta residencial|rental/i

function latestCutoff(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) || null
}

export function applyPropertyPartnersHouseScope(input: CanonicalCeoIntelligenceInput): CanonicalCeoIntelligenceInput {
  const allowedRows = input.market.rows.filter((row) => row.propertyType.trim().toLowerCase() === 'casa')
  const allowedMarketEvidence = new Set(allowedRows.flatMap((row) => row.evidenceRefs))

  const evidence = input.evidence.filter((item) => {
    if (!item.id.startsWith('market:')) return true
    return allowedMarketEvidence.has(item.id)
  })

  evidence.push({
    id: PROPERTY_PARTNERS_HOUSE_SCOPE_EVIDENCE_ID,
    claim: 'Alcance contractual del informe: ventas de casas en Vitacura.',
    source: 'Property Partners · UAT contractual de valorización de casa en Vitacura · issue #114',
    status: 'verified',
  })

  return {
    ...input,
    purpose: `${input.purpose} Alcance contractual: exclusivamente ventas de casas en Vitacura.`,
    evidence,
    market: {
      ...input.market,
      rows: allowedRows,
      portalCutoff: latestCutoff(allowedRows.map((row) => row.asOfPortal)),
      cbrsCutoff: latestCutoff(allowedRows.map((row) => row.asOfCbrs)),
    },
    sourceSnapshotId: `${input.sourceSnapshotId}:${PROPERTY_PARTNERS_HOUSE_SCOPE_TAG}`,
  }
}

function narrativeText(report: PropertyPartnersCeoIntelligenceReport) {
  return JSON.stringify({
    title: report.title,
    subtitle: report.subtitle,
    executive_summary: report.executive_summary,
    what_changed: report.what_changed,
    what_matters: report.what_matters,
    sections: report.sections,
    decisions: report.decisions,
    limitations: report.limitations,
  })
}

export function assertPropertyPartnersHouseScope(report: PropertyPartnersCeoIntelligenceReport) {
  const invalidMarketRow = report.snapshot.market.rows.find((row) => row.propertyType.trim().toLowerCase() !== 'casa')
  if (invalidMarketRow) throw new Error('CEO_INTELLIGENCE_OUT_OF_SCOPE_MARKET_ROW')
  if (OUT_OF_SCOPE_PATTERN.test(narrativeText(report))) throw new Error('CEO_INTELLIGENCE_OUT_OF_SCOPE_CONTENT')
  if (!report.source_snapshot_id.endsWith(PROPERTY_PARTNERS_HOUSE_SCOPE_TAG)) {
    throw new Error('CEO_INTELLIGENCE_SCOPE_TAG_MISSING')
  }
}

export async function buildContractScopedCeoIntelligenceInput() {
  const input = await buildLatestCeoIntelligenceInput()
  return applyPropertyPartnersHouseScope(input)
}

export async function generateContractScopedCeoIntelligenceReport(input: CanonicalCeoIntelligenceInput) {
  const report = await generateCeoIntelligenceReport(input)
  assertPropertyPartnersHouseScope(report)
  return report
}
