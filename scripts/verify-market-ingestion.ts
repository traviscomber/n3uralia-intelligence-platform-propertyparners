import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

async function main() {
  const [route, operational, page, migration] = await Promise.all([
    readFile('app/api/market/import/route.ts', 'utf8'),
    readFile('lib/market-operational.ts', 'utf8'),
    readFile('app/dashboard/market/page.tsx', 'utf8'),
    readFile('supabase/migrations/202607300210_canonical_market_aggregate_ingestion_rpc.sql', 'utf8'),
  ])

  assert.match(route, /rpc\('ingest_market_aggregate'/, 'Market import must call the canonical ingestion RPC.')
  assert.doesNotMatch(route, /from\('market_data'\)/, 'Market import must not write aggregate data to the legacy market_data table.')
  assert.match(route, /source_system/, 'Market import must preserve the source system.')
  assert.match(migration, /market_ingestion_runs/, 'Pipeline must create ingestion runs.')
  assert.match(migration, /market_raw_records/, 'Pipeline must preserve raw records.')
  assert.match(migration, /validation_errors/, 'Pipeline must persist explicit validation errors.')
  assert.match(migration, /market_metric_snapshots/, 'Accepted aggregate rows must materialize canonical snapshots.')
  assert.match(migration, /market_aggregate/, 'Aggregate imports must use an explicit dataset kind.')
  assert.match(operational, /latestIngestionAt/, 'Operational snapshot must expose ingestion freshness.')
  assert.match(page, /Estado de ingestión y calidad/, 'Market dashboard must display pipeline status.')
  assert.match(page, /supera siete días/, 'Market dashboard must warn when data is stale.')

  console.log('Canonical market ingestion verification passed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
