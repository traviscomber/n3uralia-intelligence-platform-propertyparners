import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

async function main() {
  const [route, vercel, legacyWorkflow] = await Promise.all([
    readFile('app/api/cron/market-delta/route.ts', 'utf8'),
    readFile('vercel.json', 'utf8'),
    readFile('.github/workflows/portal-daily-snapshot.yml', 'utf8'),
  ])

  assert.match(route, /portal_daily_delta_v1/, 'Daily sync must use a distinct non-full-snapshot pipeline.')
  assert.match(route, /DISCOVERY_PAGES_PER_DATASET = 1/, 'Daily Bright Data discovery must stay capped at two pages per dataset.')
  assert.match(route, /MAX_NEW_DETAILS_PER_DATASET = 12/, 'Daily new-listing enrichment must stay bounded.')
  assert.match(route, /EXISTING_PRICE_PROBES_PER_DATASET = 2/, 'Daily price-change sampling must stay bounded.')
  assert.match(route, /existingPriceProbes/, 'Daily delta must sample known listings for observable price changes.')
  assert.match(route, /discoverPortalVitacuraViaBrightData/, 'Daily discovery must use Bright Data.')
  assert.match(route, /collectPortalListingDetailsViaBrightData/, 'Daily detail enrichment must use Bright Data.')
  assert.doesNotMatch(route, /Firecrawl|FIRECRAWL/i, 'Daily sync must not consume Firecrawl quota.')
  assert.match(route, /p_full_snapshot: false/, 'Daily delta must never reconcile removals from a partial scan.')
  assert.match(route, /deferred_to_full_inventory/, 'Daily delta must explicitly defer removal reconciliation.')
  assert.match(route, /!baselineIds\.has\(String\(id\)\) && !currentIds\.has\(String\(id\)\)/, 'Only genuinely new listings may trigger Bright Data detail requests.')
  assert.match(route, /minimumProviderRequestsWhenNoChanges/, 'Daily sync must expose its request floor.')
  assert.match(vercel, /\/api\/cron\/market-delta/, 'Vercel must schedule the low-cost delta route.')
  assert.doesNotMatch(vercel, /\/api\/cron\/market-refresh\"\s*,\s*\"schedule\":\s*\"30 10/, 'Daily schedule must no longer invoke the full-market refresh.')
  assert.doesNotMatch(legacyWorkflow, /schedule:\s*[\s\S]*cron:/, 'Legacy browser snapshot must remain manual-only to avoid duplicate daily crawling.')

  console.log('Bright Data daily delta verification passed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
