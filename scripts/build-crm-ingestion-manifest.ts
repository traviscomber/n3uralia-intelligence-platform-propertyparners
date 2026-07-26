#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import {
  compareCrmManifests,
  readCrmManifest,
  scanCrmSources,
  writeCrmManifest,
} from '../lib/crm-ingestion'

export type CrmManifestCommandOptions = {
  input: string
  output: string
}

function argumentValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] ?? null : null
}

export function parseCrmManifestArgs(args = process.argv.slice(2)): CrmManifestCommandOptions {
  const input = argumentValue(args, '--input') ?? process.env.CRM_XLS_ROOT ?? null
  const output = argumentValue(args, '--output') ?? path.resolve('data/crm-ingestion-manifest.json')

  if (!input) {
    throw new Error('Use --input <Datos CRM> or define CRM_XLS_ROOT.')
  }

  return {
    input: path.resolve(input),
    output: path.resolve(output),
  }
}

export function buildCrmIngestionManifest(options: CrmManifestCommandOptions) {
  const previous = readCrmManifest(options.output)
  const current = scanCrmSources(options.input, previous)
  const changes = compareCrmManifests(previous, current)

  // Avoid persisting machine-specific absolute paths in the repository artifact.
  current.sourceRoot = path.basename(options.input)
  writeCrmManifest(options.output, current)

  return { manifest: current, changes }
}

function main(): void {
  const options = parseCrmManifestArgs()
  const { manifest, changes } = buildCrmIngestionManifest(options)

  console.log(`CRM ingestion manifest written to ${options.output}`)
  console.log(
    JSON.stringify(
      {
        workbookCount: manifest.workbookCount,
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
}

const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
  : false

if (invokedDirectly) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
