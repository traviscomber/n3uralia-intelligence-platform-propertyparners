import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'presentations-2026.json'), 'utf8'))

const failures = []
const expect = (condition, message) => { if (!condition) failures.push(message) }
expect(data.source.presentationCount === 5, `Expected 5 decks, got ${data.source.presentationCount}`)
expect(data.source.slideCount === 304, `Expected 304 slides, got ${data.source.slideCount}`)
expect(data.decks.reduce((sum, deck) => sum + deck.slideCount, 0) === 304, 'Deck slide totals do not equal 304')
expect(data.decks.every((deck) => deck.slides.length === deck.slideCount), 'At least one deck omits slides')
expect(data.source.contentCoverage.tables === 320, `Expected 320 tables, got ${data.source.contentCoverage.tables}`)
expect(data.source.contentCoverage.charts === 210, `Expected 210 charts, got ${data.source.contentCoverage.charts}`)
expect(data.source.contentCoverage.embeddedWorkbooks === 210, `Expected 210 embedded workbooks, got ${data.source.contentCoverage.embeddedWorkbooks}`)
expect(data.management.branches.length === 3, 'Expected three branch summaries')
expect(data.management.partners.length === 24, `Expected 24 partner summaries, got ${data.management.partners.length}`)
expect(data.reconciliation.comparisons.length === data.reconciliation.counts.total, 'Reconciliation count mismatch')
expect(data.reconciliation.internalChecks.length === data.reconciliation.internalCounts.total, 'Internal check count mismatch')
expect(data.reconciliation.headline.presentationYtdSales === 33, 'Presentation YTD sales changed')
expect(data.reconciliation.headline.crmYtdSales === 34, 'CRM YTD sales changed; rebuild reconciliation')
expect(data.reconciliation.headline.presentationYtdUf === 620870, 'Presentation YTD UF changed')
expect(data.reconciliation.headline.crmYtdUf === 643670, 'CRM YTD UF changed; rebuild reconciliation')

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}
console.log(`Presentations verified: ${data.source.presentationCount} decks, ${data.source.slideCount} slides, ${data.reconciliation.counts.total} comparisons.`)
