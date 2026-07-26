import {
  buildCrmIngestionState,
  type CrmIntelligenceSnapshot,
} from './crm-intelligence'

export type CrmValidationMetrics = {
  generatedAt: string
  latestPeriod: string | null
  workbookCount: number
  sheetCount: number
  datasetFamilyCount: number
  storedCells: number
  populatedCells: number
  formulaCells: number
  formulaErrorCells: number
  sourceHashes: number