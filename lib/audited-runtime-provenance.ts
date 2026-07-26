import crmIntelligence from '@/data/crm-intelligence.json'
import targets2026 from '@/data/targets-2026.json'
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

const crm = crmIntelligence as CrmSnapshotManifest
const targets = targets2026 as TargetsManifest

function digestPrefix(value: string) {
  return value.slice(0, 12)
}

export function getCrmAuditedEvidence(view: string): RuntimeProvenanceEvidence {
  const workbookDigests = crm.sourceInventory.workbooks
    .map((workbook) => digestPrefix(workbook.fileSha256))
    .sort()

  return {
    kind: 'audited',
    source: `CRM intelligence snapshot · ${crm.sourceInventory.workbookCount} workbooks`,
    observedAt: crm.generatedAt,
    cutoffLabel: `Corte CRM: ${crm.sourceInventory.periodStart}–${crm.sourceInventory.periodEnd}`,
    evidenceId: `crm-${crm.sourceInventory.periodEnd}-${workbookDigests.join('.')}`,
    details: `${view} usa data/crm-intelligence.json generado desde ${crm.sourceInventory.cellCoverage.storedCells} celdas almacenadas.`,
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
