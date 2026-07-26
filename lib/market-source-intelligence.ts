export type MarketSourceFile = {
  file: string
  sha256: string
  bytes: number
  role: string
}

export type MarketSourceIntelligence = {
  schemaVersion: number
  generatedAt: string
  scope: {
    commune: string
    operation: string
    propertyTypes: string[]
    excludedOperation: string
  }
  sourceInventory: {
    fileCount: number
    files: MarketSourceFile[]
    cellManifest: {
      file: string
      sha256: string
      bytes: number
      cellCount: number
    }
  }
  kml: {
    geometryAudit: {
      polygonCount: number
    }
  }
  cross: {
    portal: Array<{ listingIds: { present: number } }>
    portalCrossFileListingIds: { uniqueAcrossFiles: number }
    cbrs: {
      rows: number
      candidateKeyCardinality: {
        event_plus_rol: { unique: number }
      }
    }
  }
  operatingModel: {
    sourceRoles: Array<{ source: string; role: string; use: string }>
    deterministicKeys: {
      portal: string
      cbrsEvent: string
      cbrsAsset: string
      portalToCbrs: null
    }
    matchPolicy: {
      confirmedRequires: string[]
      candidateEvidence: string[]
      statuses: string[]
      currentConfirmedMatches: number
      rule: string
    }
  }
}

export type MarketIntelligenceValidation = {
  valid: boolean
  failures: string[]
  metrics: {
    sourceFiles: number
    portalRows: number
    cbrsRows: number
    polygons: number
    manifestedCells: number
  }
}

const sha256Pattern = /^[a-f0-9]{64}$/
const expectedStatuses = ['candidate_high', 'candidate_medium', 'rejected', 'confirmed']
const allowedRoles = new Set(['neighborhood_geometry', 'registered_sales', 'published_offer'])

export function marketIntelligenceMetrics(data: MarketSourceIntelligence) {
  return {
    sourceFiles: data.sourceInventory.files.length,
    portalRows: data.cross.portal.reduce((sum, item) => sum + item.listingIds.present, 0),
    cbrsRows: data.cross.cbrs.rows,
    polygons: data.kml.geometryAudit.polygonCount,
    manifestedCells: data.sourceInventory.cellManifest.cellCount,
  }
}

export function validateMarketSourceIntelligence(
  data: MarketSourceIntelligence,
): MarketIntelligenceValidation {
  const failures: string[] = []
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message)
  }
  const metrics = marketIntelligenceMetrics(data)

  expect(data.schemaVersion === 1, 'Schema version must be 1')
  expect(data.scope.commune === 'Vitacura', 'Scope commune must be Vitacura')
  expect(data.scope.operation === 'Venta', 'Scope operation must be Venta')
  expect(data.scope.excludedOperation === 'Arriendo', 'Arriendo must remain excluded')
  expect(
    [...data.scope.propertyTypes].sort().join('|') === 'Casa|Departamento',
    'Scope must include Casa and Departamento only',
  )
  expect(!Number.isNaN(Date.parse(data.generatedAt)), 'generatedAt must be a valid timestamp')

  expect(
    data.sourceInventory.fileCount === metrics.sourceFiles,
    'Declared source count must match inventory length',
  )
  expect(metrics.sourceFiles === 5, 'Expected five market source files')

  for (const source of data.sourceInventory.files) {
    expect(source.file.length > 0, 'Every source must have a filename')
    expect(sha256Pattern.test(source.sha256), `${source.file}: invalid SHA-256`)
    expect(Number.isInteger(source.bytes) && source.bytes > 0, `${source.file}: invalid byte size`)
    expect(allowedRoles.has(source.role), `${source.file}: unsupported source role`)
  }

  const sourceRoles = new Set(data.sourceInventory.files.map(({ role }) => role))
  for (const role of allowedRoles) {
    expect(sourceRoles.has(role), `Missing source role: ${role}`)
  }

  const manifest = data.sourceInventory.cellManifest
  expect(manifest.file.endsWith('.jsonl.gz'), 'Cell manifest must be a compressed JSONL file')
  expect(sha256Pattern.test(manifest.sha256), 'Cell manifest must have a valid SHA-256')
  expect(Number.isInteger(manifest.bytes) && manifest.bytes > 0, 'Cell manifest must have positive bytes')
  expect(
    Number.isInteger(manifest.cellCount) && manifest.cellCount > 0,
    'Cell manifest must contain manifested cells',
  )

  expect(metrics.portalRows === 5_197, 'Expected 5,197 Portal rows')
  expect(
    data.cross.portalCrossFileListingIds.uniqueAcrossFiles === metrics.portalRows,
    'Portal listing IDs must be globally unique',
  )
  expect(metrics.cbrsRows === 40_843, 'Expected 40,843 CBRS rows')
  expect(
    data.cross.cbrs.candidateKeyCardinality.event_plus_rol.unique === metrics.cbrsRows,
    'CBRS event-plus-ROL key must be unique',
  )
  expect(metrics.polygons === 19, 'Expected 19 KML polygons')

  const keys = data.operatingModel.deterministicKeys
  expect(keys.portal.length > 0, 'Portal deterministic key must be documented')
  expect(keys.cbrsEvent.length > 0, 'CBRS event key must be documented')
  expect(keys.cbrsAsset.length > 0, 'CBRS asset key must be documented')
  expect(keys.portalToCbrs === null, 'Portal-to-CBRS must remain non-deterministic')

  const policy = data.operatingModel.matchPolicy
  expect(policy.currentConfirmedMatches === 0, 'No Portal-CBRS match may be pre-confirmed')
  expect(policy.confirmedRequires.includes('ROL'), 'Confirmation must require ROL')
  expect(policy.confirmedRequires.includes('revisión humana'), 'Confirmation must require human review')
  expect(policy.candidateEvidence.length > 0, 'Candidate evidence must be documented')
  expect(
    policy.rule.includes('No confirmar por score probabilístico solamente'),
    'Policy must prohibit score-only confirmation',
  )
  expect(
    policy.statuses.join('|') === expectedStatuses.join('|'),
    'Candidate lifecycle statuses must remain stable',
  )

  return {
    valid: failures.length === 0,
    failures,
    metrics,
  }
}
