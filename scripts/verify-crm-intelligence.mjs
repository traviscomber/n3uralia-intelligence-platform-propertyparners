#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const file = path.resolve(process.argv[2] || 'data/crm-intelligence.json')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(data.scope?.commune === 'Vitacura', 'Scope must remain Vitacura.')
expect(data.scope?.operation === 'Venta', 'Scope must remain sales only.')
expect(JSON.stringify(data.scope?.propertyTypes) === JSON.stringify(['Casa', 'Departamento']), 'Only houses and apartments are allowed.')
expect(data.scope?.piiIncluded === false, 'Published intelligence must not contain customer PII.')
expect(data.sourceInventory?.workbookCount === 84, 'The source inventory must reconcile 84 workbooks.')
expect(data.months?.length === 6, 'The operational series must contain January-June 2026.')
expect(data.sourceInventory?.workbooks?.length === 84, 'Every workbook must have a technical audit entry.')
expect(data.sourceInventory?.formulaErrorCount === 331, 'Source formula errors must remain explicitly reconciled to 331 cells.')
expect(data.sourceInventory?.emptyHeaderCount === 7, 'Source workbooks must reconcile to seven empty auxiliary headers.')
expect(data.sourceInventory?.duplicateHeaderCount === 0, 'Source workbooks must not contain duplicate normalized headers.')
expect(data.months?.every((month) => Object.values(month.quality.files).every((file) => file.missing || file.missingColumns.length === 0)), 'Every available monthly KPI source must contain all required columns.')
expect(data.sourceInventory?.aprilFortnightReconciliation?.sales?.fortnightOnly === 1, 'The April fortnight must retain one sale absent from month-end for audit only.')
expect(data.sourceInventory?.aprilFortnightReconciliation?.captures?.fortnightOnly === 1, 'The April fortnight must retain one in-scope capture absent from month-end for audit only.')
expect(data.sourceInventory?.aprilFortnightReconciliation?.leads?.fortnightOnly === 58, 'The April fortnight must retain 58 leads absent from month-end for audit only.')
expect(data.sourceInventory?.aprilFortnightReconciliation?.requirements?.fortnightOnly === 0, 'April fortnight requirements must be a subset of month-end.')
expect(data.sourceInventory?.aprilFortnightReconciliation?.visits?.fortnightOnly === 0, 'April fortnight visits must be a subset of month-end.')
expect(data.sourceInventory?.aprilFortnightReconciliation?.suspended?.fortnightOnly === 0, 'April fortnight suspensions must be a subset of month-end.')
expect(data.quality?.sourceCoverage === 97.6, 'Source coverage must reconcile to 41 of 42 expected monthly datasets.')
expect(data.baseline2025?.salesCount === 61, 'The 2025 baseline must reconcile to 61 validated sales.')
expect(data.ytd?.salesCount === 34, 'January-June sales must reconcile to 34 validated operation IDs.')
expect(data.ytd?.salesUf === 643670, 'January-June UF volume must reconcile to UF 643,670.')
expect(data.ytd?.capturesCount === 193, 'January-June captures must reconcile to 193 property IDs.')
expect(data.ytd?.newLeadsCount === 1988, 'January-June new leads must reconcile to 1,988 lead IDs.')
expect(data.ytd?.requirementsCount === 3470, 'January-June requirements must reconcile to 3,470 IDs.')
expect(data.ytd?.visitsCount === null, 'YTD visits must remain null while February is missing.')
expect(data.ytd?.knownVisitsCount === 1591, 'Known-period visits must reconcile to 1,591 globally unique visit IDs.')
expect(data.ytd?.knownRealizedVisitsCount === 979, 'Known-period realized visits must reconcile to 979 globally unique visit IDs.')
expect(data.ytd?.knownRealizedVisitsRate === 61.5, 'Known-period realized visits must reconcile to 61.5% of appointments.')
expect(data.ytd?.sellerAttribution?.identified === 33, 'Seller attribution must identify 33 of 34 validated 2026 sales.')
expect(data.ytd?.sellerAttribution?.missing === 1, 'Exactly one validated 2026 sale must remain without an identified seller.')
expect(data.ytd?.sellerAttribution?.coverage === 97.1, 'Seller attribution coverage must reconcile to 97.1%.')
expect(data.ytd?.crossPeriodDuplicateIds?.visits === 8, 'Eight cross-period visit IDs must be detected and removed from the known-period total.')
expect(data.ytd?.crossPeriodDuplicateIds?.sales === 0, 'Sales must not contain cross-period duplicate operation IDs.')
expect(data.ytd?.crossPeriodDuplicateIds?.captures === 0, 'Captures must not contain cross-period duplicate property IDs.')
expect(data.ytd?.crossPeriodDuplicateIds?.leads === 0, 'New leads must not contain cross-period duplicate lead IDs.')
expect(data.ytd?.crossPeriodDuplicateIds?.requirements === 0, 'Requirements must not contain cross-period duplicate requirement IDs.')
expect(data.months?.find((month) => month.period === '2026-02')?.visitsCount === null, 'February visits must be marked missing, not zero.')
expect(data.months?.find((month) => month.period === '2026-06')?.salesCount === 8, 'June must retain 8 validated sales.')
expect(data.months?.find((month) => month.period === '2026-06')?.visitsCount === 319, 'June must retain 319 unique visit appointments.')
expect(data.months?.find((month) => month.period === '2026-06')?.realizedVisitsCount === 184, 'June must retain 184 realized visits.')
expect(data.baseline2025?.uniqueVisitAppointmentsCount === 3619, 'The 2025 baseline must retain 3,619 unique visit appointments.')
expect(data.baseline2025?.realizedVisitsCount === 2252, 'The 2025 baseline must retain 2,252 realized visits.')
expect(data.latestLeadSnapshot?.stale15To90 === 596, 'The June 15-90 day stale lead bucket must reconcile to 596 IDs.')
expect(data.latestLeadSnapshot?.staleOver90 === 505, 'The June over-90 day stale lead bucket must reconcile to 505 IDs.')
expect(data.latestLeadSnapshot?.staleOver15Total === 1101, 'The complete over-15 day stale lead queue must reconcile to 1,101 IDs.')
expect(data.latestLeadSnapshot?.staleOver15Rate === 62.2, 'The complete stale lead rate must reconcile to 62.2%.')
expect(data.targetsContract?.status === 'not_loaded', 'Targets must remain inactive until Metas 2026 is validated.')

if (failures.length) {
  console.error('CRM intelligence verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('CRM intelligence verification passed.')
console.log(JSON.stringify({ scope: data.scope, workbooks: data.sourceInventory.workbookCount, ytd: data.ytd, sourceCoverage: data.quality.sourceCoverage }, null, 2))
