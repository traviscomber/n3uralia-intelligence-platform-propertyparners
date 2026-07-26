import crmIntelligence from '@/data/crm-intelligence.json'
import targets2026 from '@/data/targets-2026.json'
import presentationsSummary from '@/data/presentations-2026-summary.json'
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

type PresentationManifest = {
  generatedAt: string
  source: {
    sha256: string
    presentationCount: number
    slideCount: number
    contentCoverage: { tables: number; charts: number }
  }
  scope: { period: string }
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
const presentations = presentationsSummary as PresentationManifest
const market = marketIntelligence as MarketManifest
const valuation = valuationIntelligence as ValuationManifest

function digestPrefix(value: string) {
  return value.slice(0, 12)
}

function latestTimestamp(values: string[]) {
  return [...values].sort().at(-1) ?? values[0]
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
    observedAt: latestTimestamp([crm.generatedAt, targets.generatedAt]),
    evidenceId: `${crmEvidence.evidenceId}.targets-${targets.version}`,
    details: `${crmEvidence.details} Metas cargadas desde ${targets.cellCoverage.workbookCount} workbooks y ${targets.cellCoverage.storedCells} celdas.`,
  }
}

export function getPresentationsAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  return {
    kind: 'audited',
    source: `${presentations.source.presentationCount} presentaciones · ${presentations.source.slideCount} láminas`,
    observedAt: presentations.generatedAt,
    cutoffLabel: `Corte presentaciones: ${presentations.scope.period}`,
    evidenceId: `presentations-${digestPrefix(presentations.source.sha256)}`,
    details: `${view} usa el manifiesto auditado con ${presentations.source.contentCoverage.tables} tablas y ${presentations.source.contentCoverage.charts} gráficos.`,
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
    observedAt: latestTimestamp([marketEvidence.observedAt, valuationEvidence.observedAt]),
    cutoffLabel: 'Mercado y valorización · snapshots auditados separados',
    evidenceId: `${marketEvidence.evidenceId}.${valuationEvidence.evidenceId}`,
    details: `${marketEvidence.details} ${valuationEvidence.details}`,
  }
}

export function getCorporateIntelligenceEvidence(view: string): RuntimeProvenanceEvidence {
  const executiveEvidence = getExecutiveAuditedEvidence(view)
  const presentationEvidence = getPresentationsAuditedEvidence(view)
  const marketEvidence = getMarketAuditedEvidence(view)
  const valuationEvidence = getValuationAuditedEvidence(view)

  return {
    kind: 'audited',
    source: 'CRM + metas + presentaciones + mercado + valorización',
    observedAt: latestTimestamp([executiveEvidence.observedAt, presentationEvidence.observedAt, marketEvidence.observedAt, valuationEvidence.observedAt]),
    cutoffLabel: `Cortes combinados · CRM ${crm.sourceInventory.periodEnd} · presentaciones ${presentations.scope.period}`,
    evidenceId: `${executiveEvidence.evidenceId}.${presentationEvidence.evidenceId}.${marketEvidence.evidenceId}.${valuationEvidence.evidenceId}`,
    details: `${view} combina cinco dominios auditados; cada uno conserva su propio manifiesto, corte e identificador.`,
  }
}

export function getMlLabAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const combined = getMarketAndValuationAuditedEvidence(view)
  return {
    ...combined,
    source: 'Baseline ML · mercado + plantillas de valorización',
    cutoffLabel: `Preparación ML · ${market.sourceInventory.fileCount} archivos de mercado · ${valuation.sourceInventory.length} plantillas`,
    evidenceId: `ml-baseline.${combined.evidenceId}`,
    details: `${view} informa preparación sobre fuentes auditadas; no acredita un modelo entrenado, aprobado ni habilitado para uso comercial.`,
  }
}
