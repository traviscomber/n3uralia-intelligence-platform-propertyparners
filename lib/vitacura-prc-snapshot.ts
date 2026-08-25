import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type VitacuraPrcSnapshotRow = {
  ext_feature_id: string
  zona_prc: string
  zona: string
  subzona: string
  uso: string | null
  uso_suelo: string | null
  source_url: string
  source_version: string
  raw_properties: Record<string, unknown>
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

export type VitacuraPrcSnapshot = {
  schemaVersion: 1
  source: {
    provider: 'MINVU ArcGIS'
    service: string
    layerId: 41
    layerName: 'PRC_Vitacura_20160920'
    sourceVersion: string
    observedAt: string
    effectiveContext: 'historical_backtest_only'
  }
  rows: VitacuraPrcSnapshotRow[]
  checksumSha256: string
}

export const VITACURA_PRC_SNAPSHOT_PATH = path.join(
  process.cwd(),
  'data',
  'structural',
  'vitacura_prc_20160920.json',
)

function canonicalRows(rows: VitacuraPrcSnapshotRow[]) {
  return JSON.stringify(rows)
}

export function checksumVitacuraPrcRows(rows: VitacuraPrcSnapshotRow[]) {
  return createHash('sha256').update(canonicalRows(rows)).digest('hex')
}

export function validateVitacuraPrcSnapshot(value: unknown): VitacuraPrcSnapshot {
  if (!value || typeof value !== 'object') throw new Error('PRC snapshot must be an object')
  const snapshot = value as Partial<VitacuraPrcSnapshot>
  if (snapshot.schemaVersion !== 1) throw new Error('Unsupported PRC snapshot schema')
  if (!snapshot.source || snapshot.source.layerId !== 41 || snapshot.source.layerName !== 'PRC_Vitacura_20160920') {
    throw new Error('Unexpected PRC snapshot source')
  }
  if (snapshot.source.effectiveContext !== 'historical_backtest_only') {
    throw new Error('PRC snapshot must be explicitly historical/backtest-only')
  }
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length === 0) throw new Error('PRC snapshot has no rows')

  for (const row of snapshot.rows) {
    if (!row.ext_feature_id || !row.zona || !row.source_version) throw new Error('PRC snapshot row is incomplete')
    if (row.geometry?.type !== 'MultiPolygon' || !Array.isArray(row.geometry.coordinates) || row.geometry.coordinates.length === 0) {
      throw new Error(`PRC snapshot row ${row.ext_feature_id} has invalid geometry`)
    }
  }

  const actualChecksum = checksumVitacuraPrcRows(snapshot.rows)
  if (!snapshot.checksumSha256 || snapshot.checksumSha256 !== actualChecksum) {
    throw new Error('PRC snapshot checksum mismatch')
  }

  return snapshot as VitacuraPrcSnapshot
}

export async function loadVitacuraPrcSnapshot() {
  const text = await readFile(VITACURA_PRC_SNAPSHOT_PATH, 'utf8')
  return validateVitacuraPrcSnapshot(JSON.parse(text))
}
