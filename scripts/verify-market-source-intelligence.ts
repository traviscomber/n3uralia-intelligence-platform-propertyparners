import data from '../data/market-source-intelligence.json' with { type: 'json' }
import {
  type MarketSourceIntelligence,
  validateMarketSourceIntelligence,
} from '../lib/market-source-intelligence'

const validation = validateMarketSourceIntelligence(data as MarketSourceIntelligence)

if (!validation.valid) {
  console.error(validation.failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

const { sourceFiles, portalRows, cbrsRows, polygons, manifestedCells } = validation.metrics

console.log(
  `Market source intelligence verified: ${sourceFiles} sources, ${portalRows.toLocaleString('en-US')} Portal listings, ${cbrsRows.toLocaleString('en-US')} CBRS rows, ${polygons} polygons, ${manifestedCells.toLocaleString('en-US')} manifested cells.`,
)
