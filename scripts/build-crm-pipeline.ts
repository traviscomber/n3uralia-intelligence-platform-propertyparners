#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

import {
  compareCrmManifests,
  readCrmManifest,
  scanCrmSources,
  writeCrmManifest,
} from '../lib/crm-ingestion'

function argumentValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] ?? null : null
}

function main(): void {
  const args = process.argv.slice(2)
  const input = argumentValue(args, '--input') ?? process.env.CRM_XLS_ROOT ?? null

  if (!input) {
    throw new Error('Use --input <Datos CRM> or define CRM_XLS_ROOT.')
  }

  const absoluteInput = path.resolve(input)
  const manifestOutput = path.resolve(
    argumentValue(args, '--ingestion-manifest-output') ?? 'data/crm-ingestion-manifest.json',
  )
  const previous = readCrmManifest(manifestOutput)
  const current = scanCrmSources(absoluteInput, previous)
  const changes = compareCrmManifests(previous, current)

  current.sourceRoot = path.basename(absoluteInput)
  writeCrmManifest(manifestOutput, current)

  console.log(`CRM ingestion manifest written to ${manifestOutput}`)
  console.log(
    JSON.stringify(
      {
        workbookCount: current.workbookCount,
        changes: {
          added: changes.added.length,
          modified: changes.modified.length,
          removed: changes.removed.length,
          unchanged: changes.unchanged.length,
        },
        affectedDatasets: [...new Set([
          ...changes.added,
          ...changes.modified,
          ...changes.removed,
        ].map((workbook) => workbook.dataset))].sort(),
      },
      null,
      2,
    ),
  )

  const legacyScript = path.resolve('scripts/build-crm-intelligence.mjs')
  const child = spawnSync(process.execPath, [legacyScript, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })

  if (child.error) throw child.error
  if (child.status !== 0) {
    throw new Error(`CRM intelligence builder exited with status ${child.status ?? 'unknown'}.`)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
