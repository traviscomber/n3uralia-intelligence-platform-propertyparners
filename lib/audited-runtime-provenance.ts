import crmIntelligence from '@/data/crm-intelligence.json'
import targets2026 from '@/data/targets-2026.json'
import marketIntelligence from '@/data/market-source-intelligence.json'
import valuationIntelligence from '@/data/valuation-intelligence.json'
import type { RuntimeProvenanceEvidence } from '@/lib/runtime-provenance'

type CrmSnapshotManifest = {
  generatedAt: string
  sourceInventory: {
    periodStart: string
    periodEnd: string
    workbookCount: number
    cellCoverage: { storedCells: number }
    workbooks: Array<{ file: string; fileSha256: string }>
  }
}

type TargetsManifest = {
  generatedAt: string
  version: string
  cellCoverage: { workbookCount: number; storedCells: number }
}

type MarketManifest = {
  generatedAt: string
  scope: { commune: string; operation: string }
  sourceInventory: {
    fileCount: number
    files: Array<{ file: string; sha256: string; role: string }>
    cellManifest: { cellCount: number }
  }
}

type ValuationManifest = {
  generatedAt: string
  sourceInventory: Array<{
    file: string
    sha256: string
    modifiedAt: string
    sheets: Array<{ populatedCells: number; formulaCells: number; formulaErrorCells: number }>
  }>
}

const crm = crmIntelligence as CrmSnapshotManifest
const targets = targets2026 as TargetsManifest
const market = marketIntelligence as MarketManifest
const valuation = valuationIntelligence as ValuationManifest

function digestPrefix(value: string) {
  return value.slice(0, 12)
}

export function getCrmAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const workbookDigests = crm.sourceInventory.workbooks.map((workbook) => digestPrefix(workbook.fileSha256)).sort()
  return {
    kind: 'audited',
    source: `CRM intelligence snapshot · ${crm.sourceInventory.workbookCount} workbooks`,
    observedAt: crm.generatedAt,
    cutoffLabel: `Corte CRM: ${crm.sourceInventory.periodStart}–${crm.sourceInventory.periodEnd}`,
    evidenceId: `crm-${crm.sourceInventory.periodEnd}-${workbookDigests.join('.')}`,
    details: `${view} usa data/crm-intelligence.json generado desde ${crm.sourceInventory.cellCoverage.storedCells} celdas almacenadas.`,
  }
}

export function getTargetsAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  return {
    kind: 'audited',
    source: `Metas 2026 · ${targets.cellCoverage.workbookCount} workbooks`,
    observedAt: targets.generatedAt,
    cutoffLabel: `Versión metas: ${targets.version}`,
    evidenceId: `targets-${targets.version}-${targets.cellCoverage.storedCells}`,
    details: `${view} usa data/targets-2026.json con ${targets.cellCoverage.storedCells} celdas almacenadas.`,
  }
}

export function getExecutiveAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const crmEvidence = getCrmAuditedEvidence(view)
  return {
    ...crmEvidence,
    source: `${crmEvidence.source} + metas ${targets.version}`,
    observedAt: [crm.generatedAt, targets.generatedAt].sort().at(-1) ?? crm.generatedAt,
    evidenceId: `${crmEvidence.evidenceId}.targets-${targets.version}`,
    details: `${crmEvidence.details} Metas cargadas desde ${targets.cellCoverage.workbookCount} workbooks y ${targets.cellCoverage.storedCells} celdas.`,
  }
}

export function getMarketAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const digests = market.sourceInventory.files.map((file) => digestPrefix(file.sha256)).sort()
  const roles = [...new Set(market.sourceInventory.files.map((file) => file.role))].sort().join(', ')
  return {
    kind: 'audited',
    source: `Market intelligence snapshot · ${market.sourceInventory.fileCount} archivos`,
    observedAt: market.generatedAt,
    cutoffLabel: `${market.scope.commune} · ${market.scope.operation} · snapshot auditado`,
    evidenceId: `market-${digests.join('.')}`,
    details: `${view} usa data/market-source-intelligence.json con ${market.sourceInventory.cellManifest.cellCount} celdas y roles ${roles}.`,
  }
}

export function getValuationAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const digests = valuation.sourceInventory.map((file) => digestPrefix(file.sha256)).sort()
  const latestSourceModification = valuation.sourceInventory.map((file) => file.modifiedAt).sort().at(-1)
  const populatedCells = valuation.sourceInventory.flatMap((file) => file.sheets).reduce((sum, sheet) => sum + sheet.populatedCells, 0)
  const formulaCells = valuation.sourceInventory.flatMap((file) => file.sheets).reduce((sum, sheet) => sum + sheet.formulaCells, 0)
  return {
    kind: 'audited',
    source: `Valuation templates · ${valuation.sourceInventory.length} workbooks`,
    observedAt: valuation.generatedAt,
    cutoffLabel: latestSourceModification ? `Última modificación fuente: ${latestSourceModification.slice(0, 10)}` : 'Fecha fuente n/d',
    evidenceId: `valuation-${digests.join('.')}`,
    details: `${view} usa data/valuation-intelligence.json con ${populatedCells} celdas pobladas y ${formulaCells} fórmulas auditadas.`,
  }
}

export function getMarketAndValuationAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const marketEvidence = getMarketAuditedEvidence(view)
  const valuationEvidence = getValuationAuditedEvidence(view)
  return {
    kind: 'audited',
    source: `${marketEvidence.source} + ${valuationEvidence.source}`,
    observedAt: [marketEvidence.observedAt, valuationEvidence.observedAt].sort().at(-1) ?? marketEvidence.observedAt,
    cutoffLabel: 'Mercado y valorización · snapshots auditados separados',
    evidenceId: `${marketEvidence.evidenceId}.${valuationEvidence.evidenceId}`,
    details: `${marketEvidence.details} ${valuationEvidence.details}`,
  }
}
