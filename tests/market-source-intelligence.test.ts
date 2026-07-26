import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

type SourceFile = {
  file: string
  sha256: string
  bytes: number
  role: string
}

type MarketSourceIntelligence = {
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
    files: SourceFile[]
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(
  fs.readFileSync(path.join(root, 'data', 'market-source-intelligence.json'), 'utf8'),
) as MarketSourceIntelligence

const sha256Pattern = /^[a-f0-9]{64}$/

describe('market intelligence scope', () => {
  it('is explicitly limited to Vitacura sale intelligence', () => {
    assert.equal(data.schemaVersion, 1)
    assert.equal(data.scope.commune, 'Vitacura')
    assert.equal(data.scope.operation, 'Venta')
    assert.equal(data.scope.excludedOperation, 'Arriendo')
    assert.deepEqual([...data.scope.propertyTypes].sort(), ['Casa', 'Departamento'])
    assert.equal(Number.isNaN(Date.parse(data.generatedAt)), false)
  })
})

describe('market source inventory', () => {
  it('keeps declared and actual file counts consistent', () => {
    assert.equal(data.sourceInventory.fileCount, data.sourceInventory.files.length)
    assert.equal(data.sourceInventory.fileCount, 5)
  })

  it('assigns every source a valid hash, positive size and semantic role', () => {
    const allowedRoles = new Set(['neighborhood_geometry', 'registered_sales', 'published_offer'])

    for (const source of data.sourceInventory.files) {
      assert.equal(source.file.length > 0, true)
      assert.match(source.sha256, sha256Pattern)
      assert.equal(Number.isInteger(source.bytes) && source.bytes > 0, true)
      assert.equal(allowedRoles.has(source.role), true)
    }
  })

  it('contains geometry, registered sales and published offers', () => {
    const roles = new Set(data.sourceInventory.files.map(({ role }) => role))

    assert.equal(roles.has('neighborhood_geometry'), true)
    assert.equal(roles.has('registered_sales'), true)
    assert.equal(roles.has('published_offer'), true)
  })

  it('tracks the complete cell manifest with provenance metadata', () => {
    const manifest = data.sourceInventory.cellManifest

    assert.equal(manifest.file.endsWith('.jsonl.gz'), true)
    assert.match(manifest.sha256, sha256Pattern)
    assert.equal(Number.isInteger(manifest.bytes) && manifest.bytes > 0, true)
    assert.equal(Number.isInteger(manifest.cellCount) && manifest.cellCount > 0, true)
  })
})

describe('market source cardinality', () => {
  it('keeps Portal listing IDs globally unique across files', () => {
    const portalRows = data.cross.portal.reduce((sum, item) => sum + item.listingIds.present, 0)

    assert.equal(portalRows, 5_197)
    assert.equal(data.cross.portalCrossFileListingIds.uniqueAcrossFiles, portalRows)
  })

  it('uses a unique event-plus-ROL asset key for every CBRS row', () => {
    assert.equal(data.cross.cbrs.rows, 40_843)
    assert.equal(data.cross.cbrs.candidateKeyCardinality.event_plus_rol.unique, data.cross.cbrs.rows)
  })

  it('preserves the expected territorial geometry coverage', () => {
    assert.equal(data.kml.geometryAudit.polygonCount, 19)
  })
})

describe('market matching policy', () => {
  it('does not claim a deterministic Portal-to-CBRS join', () => {
    assert.equal(data.operatingModel.deterministicKeys.portalToCbrs, null)
    assert.equal(data.operatingModel.deterministicKeys.portal.length > 0, true)
    assert.equal(data.operatingModel.deterministicKeys.cbrsEvent.length > 0, true)
    assert.equal(data.operatingModel.deterministicKeys.cbrsAsset.length > 0, true)
  })

  it('requires human-verifiable evidence before confirmation', () => {
    const policy = data.operatingModel.matchPolicy

    assert.equal(policy.currentConfirmedMatches, 0)
    assert.equal(policy.confirmedRequires.includes('ROL'), true)
    assert.equal(policy.confirmedRequires.includes('revisión humana'), true)
    assert.equal(policy.candidateEvidence.length > 0, true)
    assert.match(policy.rule, /No confirmar por score probabilístico solamente/)
  })

  it('defines an explicit candidate lifecycle', () => {
    assert.deepEqual(data.operatingModel.matchPolicy.statuses, [
      'candidate_high',
      'candidate_medium',
      'rejected',
      'confirmed',
    ])
  })

  it('documents distinct roles for each market source family', () => {
    const roles = new Map(data.operatingModel.sourceRoles.map((item) => [item.source, item]))

    assert.equal(roles.get('Portal Inmobiliario')?.role, 'Oferta publicada')
    assert.equal(roles.get('CBRS Vitacura')?.role, 'Ventas registradas')
    assert.equal(roles.get('KML Barrios Vitacura')?.role, 'Geometría territorial')

    for (const role of roles.values()) {
      assert.equal(role.use.length > 0, true)
    }
  })
})
