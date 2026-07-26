#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { assertValidCrmIntelligence } from '../lib/crm-intelligence-validator.ts'

const file = path.resolve(process.argv[2] || 'data/crm-intelligence.json')

if (!fs.existsSync(file)) {
  console.error(`CRM intelligence verification failed:\n- Snapshot not found: ${file}`)
  process.exit(1)
}

let data
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'))
} catch (error) {
  console.error('CRM intelligence verification failed:')
  console.error(`- Snapshot is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

try {
  const result = assertValidCrmIntelligence(data)

  for (const warning of result.warnings) {
    console.warn(`CRM intelligence warning: ${warning}`)
  }

  console.log('CRM intelligence verification passed.')
  console.log(
    JSON.stringify(
      {
        scope: data.scope,
        ingestion: result.metrics,
        sourceCoverage: data.quality?.sourceCoverage ?? null,
        ytd: data.ytd ?? null,
      },
      null,
      2,
    ),
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
