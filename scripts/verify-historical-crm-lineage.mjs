#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const intelligencePath = path.resolve('data/crm-intelligence.json')
if (!fs.existsSync(intelligencePath)) throw new Error('Missing data/crm-intelligence.json')

const intelligence = JSON.parse(fs.readFileSync(intelligencePath, 'utf8'))
const workbooks = intelligence?.sourceInventory?.workbooks ?? []

if (intelligence?.sourceInventory?.workbookCount !== 84 || workbooks.length !== 84) {
  throw new Error(`HISTORICAL_CRM_INVENTORY_MISMATCH expected=84 declared=${intelligence?.sourceInventory?.workbookCount ?? 'null'} actual=${workbooks.length}`)
}

const hashes = new Set()
const authoritative = []
const review = []
for (const workbook of workbooks) {
  if (!workbook.file || !workbook.fileSha256 || !workbook.dataset || !workbook.sourceRole) {
    throw new Error(`HISTORICAL_CRM_INCOMPLETE_WORKBOOK ${JSON.stringify({ file: workbook.file, dataset: workbook.dataset, sourceRole: workbook.sourceRole })}`)
  }
  if (!/^[a-f0-9]{64}$/i.test(workbook.fileSha256)) {
    throw new Error(`HISTORICAL_CRM_INVALID_SHA256 ${workbook.file}`)
  }
  if (hashes.has(workbook.fileSha256)) {
    throw new Error(`HISTORICAL_CRM_DUPLICATE_SHA256 ${workbook.file}`)
  }
  hashes.add(workbook.fileSha256)
  if (workbook.sourceRole === 'authoritative') authoritative.push(workbook)
  else review.push(workbook)
}

if (authoritative.length !== 45 || review.length !== 39) {
  throw new Error(`HISTORICAL_CRM_ROLE_COUNTS_MISMATCH authoritative=${authoritative.length} review=${review.length}`)
}

const manifest = {
  schemaVersion: 1,
  generatedFrom: 'data/crm-intelligence.json',
  policy: {
    productionCanonicalRule: 'A historical workbook is canonical in Supabase only when its exact SHA-256 is present in management_import_runs.source_reference and promoted metric values preserve the same source reference.',
    authoritative: 'eligible_for_controlled_backfill_after_schema_alias_and_reconciliation_gates',
    nonAuthoritative: 'evidence_only_until_reconciled; never auto-promote',
  },
  counts: {
    total: workbooks.length,
    authoritative: authoritative.length,
    requiresReview: review.length,
  },
  workbooks: workbooks.map((workbook) => ({
    file: workbook.file,
    period: workbook.period,
    dataset: workbook.dataset,
    sourceRole: workbook.sourceRole,
    sha256: workbook.fileSha256,
    dataRows: workbook.dataRows,
    selectedSheet: workbook.selectedSheet,
    integrationClass: workbook.sourceRole === 'authoritative' ? 'backfill_candidate' : 'reconciliation_required',
  })),
}

const out = path.resolve('data/historical-crm-lineage-manifest.json')
fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ status: 'ok', output: path.relative(process.cwd(), out), ...manifest.counts }, null, 2))
