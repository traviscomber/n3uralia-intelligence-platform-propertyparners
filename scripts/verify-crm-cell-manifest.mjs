#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import XLSX from 'xlsx'

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (flag) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : null
  }
  const input = value('--input') || process.env.CRM_XLS_ROOT
  const manifest = value('--manifest') || path.resolve('data/crm-cell-manifest.json')
  if (!input) throw new Error('Use --input <Datos CRM> or define CRM_XLS_ROOT.')
  return { input: path.resolve(input), manifest: path.resolve(manifest) }
}

function stableValue(value) {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Buffer.isBuffer(value)) return { $buffer: value.toString('base64') }
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

function digestFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function digestSheet(sheet) {
  const addresses = Object.keys(sheet).filter((address) => !address.startsWith('!')).sort((a, b) => a.localeCompare(b))
  const digest = crypto.createHash('sha256')
  let populatedCells = 0
  let formulaCells = 0
  let formulaErrorCells = 0
  let commentCells = 0
  let hyperlinkCells = 0

  for (const address of addresses) {
    const value = sheet[address]
    digest.update(JSON.stringify([address, stableValue(value)]))
    if (value?.v !== undefined || value?.f) populatedCells += 1
    if (value?.f) formulaCells += 1
    if (value?.t === 'e') formulaErrorCells += 1
    if (value?.c?.length) commentCells += 1
    if (value?.l) hyperlinkCells += 1
  }

  return {
    range: sheet['!ref'] ?? null,
    storedCells: addresses.length,
    populatedCells,
    formulaCells,
    formulaErrorCells,
    commentCells,
    hyperlinkCells,
    cellDigest: digest.digest('hex'),
  }
}

function listWorkbooks(root) {
  const files = []
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const absolute = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.name.toLowerCase().endsWith('.xlsx')) files.push(absolute)
    }
  }
  visit(root)
  return files.sort((a, b) => a.localeCompare(b))
}

function main() {
  const { input, manifest: manifestPath } = parseArgs()
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const expectedByPath = new Map(manifest.workbooks.map((workbook) => [workbook.file, workbook]))
  const files = listWorkbooks(input)
  const failures = []
  const totals = { workbookCount: files.length, sheetCount: 0, storedCells: 0, populatedCells: 0, formulaCells: 0, formulaErrorCells: 0 }

  if (files.length !== manifest.coverage.workbookCount) failures.push(`Workbook count ${files.length} != ${manifest.coverage.workbookCount}`)

  for (const file of files) {
    const relative = path.relative(input, file).replaceAll('\\', '/')
    const expected = expectedByPath.get(relative)
    if (!expected) {
      failures.push(`Unexpected workbook: ${relative}`)
      continue
    }
    expectedByPath.delete(relative)

    const fileHash = digestFile(file)
    if (fileHash !== expected.fileSha256) failures.push(`Binary hash mismatch: ${relative}`)
    if (fs.statSync(file).size !== expected.byteSize) failures.push(`Byte size mismatch: ${relative}`)

    const workbook = XLSX.readFile(file, { cellFormula: true, cellStyles: true, cellNF: true, cellDates: true, sheetStubs: true })
    if (JSON.stringify(workbook.SheetNames) !== JSON.stringify(expected.sheets.map((sheet) => sheet.name))) failures.push(`Sheet list mismatch: ${relative}`)

    for (const expectedSheet of expected.sheets) {
      const sheet = workbook.Sheets[expectedSheet.name]
      if (!sheet) continue
      const actual = digestSheet(sheet)
      totals.sheetCount += 1
      totals.storedCells += actual.storedCells
      totals.populatedCells += actual.populatedCells
      totals.formulaCells += actual.formulaCells
      totals.formulaErrorCells += actual.formulaErrorCells
      for (const key of ['range', 'storedCells', 'populatedCells', 'formulaCells', 'formulaErrorCells', 'commentCells', 'hyperlinkCells', 'cellDigest']) {
        if (actual[key] !== expectedSheet[key]) failures.push(`${key} mismatch: ${relative} / ${expectedSheet.name}`)
      }
    }
  }

  for (const missing of expectedByPath.keys()) failures.push(`Missing workbook: ${missing}`)
  for (const key of Object.keys(totals)) {
    if (totals[key] !== manifest.coverage[key]) failures.push(`Coverage ${key} ${totals[key]} != ${manifest.coverage[key]}`)
  }

  if (failures.length) {
    console.error('CRM cell manifest verification failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log('CRM cell manifest verification passed.')
  console.log(JSON.stringify({ coverage: totals, rawValuesPublished: manifest.privacy.rawValuesIncluded }, null, 2))
}

main()
