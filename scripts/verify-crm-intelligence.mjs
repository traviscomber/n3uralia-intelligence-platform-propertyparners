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
expect(data.quality?.sourceCoverage === 97.6, 'Source coverage must reconcile to 41 of 42 expected monthly datasets.')
expect(data.baseline2025?.salesCount === 61, 'The 2025 baseline must reconcile to 61 validated sales.')
expect(data.ytd?.salesCount === 34, 'January-June sales must reconcile to 34 validated operation IDs.')
expect(data.ytd?.salesUf === 643670, 'January-June UF volume must reconcile to UF 643,670.')
expect(data.ytd?.capturesCount === 193, 'January-June captures must reconcile to 193 property IDs.')
expect(data.ytd?.newLeadsCount === 1988, 'January-June new leads must reconcile to 1,988 lead IDs.')
expect(data.ytd?.requirementsCount === 3470, 'January-June requirements must reconcile to 3,470 IDs.')
expect(data.ytd?.visitsCount === null, 'YTD visits must remain null while February is missing.')
expect(data.months?.find((month) => month.period === '2026-02')?.visitsCount === null, 'February visits must be marked missing, not zero.')
expect(data.months?.find((month) => month.period === '2026-06')?.salesCount === 8, 'June must retain 8 validated sales.')
expect(data.targetsContract?.status === 'not_loaded', 'Targets must remain inactive until Metas 2026 is validated.')

if (failures.length) {
  console.error('CRM intelligence verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('CRM intelligence verification passed.')
console.log(JSON.stringify({ scope: data.scope, workbooks: data.sourceInventory.workbookCount, ytd: data.ytd, sourceCoverage: data.quality.sourceCoverage }, null, 2))
