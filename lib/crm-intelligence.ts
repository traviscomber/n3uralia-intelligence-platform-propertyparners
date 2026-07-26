export type CrmScope = {
  commune: string
  operation: string
  propertyTypes: string[]
  piiIncluded: boolean
}

export type CrmWorkbookAudit = {
  file: string
  fileSha256: string
  sheets: Array<{
    name: string
    cellDigest: string
  }>
}

export type CrmIntelligenceSnapshot = {
  schemaVersion: number
  generatedAt: string
  scope: CrmScope
  months: Array<{ period: string }>
  sourceInventory: {
    workbookCount: number
    workbooks: CrmWorkbookAudit[]
    cellCoverage: {
      workbookCount: number
      sheetCount: number
      storedCells: number
      populatedCells: number
      formulaCells: number
      formulaErrorCells: number
    }
    datasetCoverage: Array<{ dataset: string; workbookCount: number }>
  }
}

export type CrmIngestionState = {
  generatedAt: string
  latestPeriod: string | null
  workbookCount: number
  sheetCount: number
  datasetFamilyCount: number
  sourceHashes: string[]
  valid: boolean
  failures: string[]
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/

export function buildCrmIngestionState(snapshot: CrmIntelligenceSnapshot): CrmIngestionState {
  const failures: string[] = []
  const workbooks = snapshot.sourceInventory.workbooks
  const workbookCount = workbooks.length
  const sheetCount = workbooks.reduce((sum, workbook) => sum + workbook.sheets.length, 0)
  const sourceHashes = workbooks.flatMap((workbook) => [
    workbook.fileSha256,
    ...workbook.sheets.map((sheet) => sheet.cellDigest),
  ])

  if (snapshot.scope.commune !== 'Vitacura') failures.push('CRM scope must remain Vitacura.')
  if (snapshot.scope.operation !== 'Venta') failures.push('CRM scope must remain sales only.')
  if (JSON.stringify(snapshot.scope.propertyTypes) !== JSON.stringify(['Casa', 'Departamento'])) {
    failures.push('CRM scope must remain limited to houses and apartments.')
  }
  if (snapshot.scope.piiIncluded) failures.push('Published CRM intelligence must not contain PII.')

  if (snapshot.sourceInventory.workbookCount !== workbookCount) {
    failures.push('Workbook inventory count must reconcile to the current uploaded files.')
  }
  if (snapshot.sourceInventory.cellCoverage.workbookCount !== workbookCount) {
    failures.push('Cell coverage must reconcile to the current uploaded files.')
  }
  if (snapshot.sourceInventory.cellCoverage.sheetCount !== sheetCount) {
    failures.push('Sheet coverage must reconcile to the current workbook inventory.')
  }
  if (sourceHashes.some((hash) => !SHA256_PATTERN.test(hash))) {
    failures.push('Every workbook and sheet must retain a valid SHA-256 digest.')
  }
  if (new Set(workbooks.map((workbook) => workbook.file)).size !== workbookCount) {
    failures.push('Workbook inventory paths must be unique.')
  }

  const periods = snapshot.months.map((month) => month.period).sort()

  return {
    generatedAt: snapshot.generatedAt,
    latestPeriod: periods.at(-1) ?? null,
    workbookCount,
    sheetCount,
    datasetFamilyCount: snapshot.sourceInventory.datasetCoverage.length,
    sourceHashes,
    valid: failures.length === 0,
    failures,
  }
}
