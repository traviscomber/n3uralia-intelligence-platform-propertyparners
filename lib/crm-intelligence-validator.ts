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
}

export type CrmValidationResult = {
  valid: boolean
  failures: string[]
  warnings: string[]
  metrics: CrmValidationMetrics
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

export function validateCrmIntelligence(
  snapshot: CrmIntelligenceSnapshot,
): CrmValidationResult {
  const state = buildCrmIngestionState(snapshot)
  const failures = [...state.failures]
  const warnings: string[] = []
  const coverage = snapshot.sourceInventory.cellCoverage

  if (!isIsoDate(snapshot.generatedAt)) {
    failures.push('CRM generatedAt must be a valid ISO-compatible timestamp.')
  }

  if (!Number.isInteger(snapshot.schemaVersion) || snapshot.schemaVersion < 1) {
    failures.push('CRM schemaVersion must be a positive integer.')
  }

  for (const [field, value] of Object.entries(coverage)) {
    if (!isNonNegativeInteger(value)) {
      failures.push(`CRM cell coverage ${field} must be a non-negative integer.`)
    }
  }

  if (coverage.populatedCells > coverage.storedCells) {
    failures.push('CRM populated cell count cannot exceed stored cell count.')
  }

  if (coverage.formulaCells > coverage.storedCells) {
    failures.push('CRM formula cell count cannot exceed stored cell count.')
  }

  if (coverage.formulaErrorCells > coverage.formulaCells) {
    failures.push('CRM formula error count cannot exceed formula cell count.')
  }

  const periods = snapshot.months.map((month) => month.period)
  if (new Set(periods).size !== periods.length) {
    failures.push('CRM monthly periods must be unique.')
  }

  if (periods.some((period) => !/^\d{4}-\d{2}$/.test(period))) {
    failures.push('CRM monthly periods must use YYYY-MM format.')
  }

  if (state.workbookCount === 0) {
    warnings.push('CRM inventory contains no workbooks.')
  }

  if (state.datasetFamilyCount === 0) {
    warnings.push('CRM inventory contains no classified dataset families.')
  }

  if (coverage.formulaErrorCells > 0) {
    warnings.push(
      `CRM source workbooks contain ${coverage.formulaErrorCells} formula error cells; they remain preserved for audit.`,
    )
  }

  return {
    valid: failures.length === 0,
    failures,
    warnings,
    metrics: {
      generatedAt: state.generatedAt,
      latestPeriod: state.latestPeriod,
      workbookCount: state.workbookCount,
      sheetCount: state.sheetCount,
      datasetFamilyCount: state.datasetFamilyCount,
      storedCells: coverage.storedCells,
      populatedCells: coverage.populatedCells,
      formulaCells: coverage.formulaCells,
      formulaErrorCells: coverage.formulaErrorCells,
      sourceHashes: state.sourceHashes.length,
    },
  }
}

export function assertValidCrmIntelligence(
  snapshot: CrmIntelligenceSnapshot,
): CrmValidationResult {
  const result = validateCrmIntelligence(snapshot)
  if (!result.valid) {
    throw new Error(`CRM intelligence validation failed:\n- ${result.failures.join('\n- ')}`)
  }
  return result
}
