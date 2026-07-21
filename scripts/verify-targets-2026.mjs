#!/usr/bin/env node

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const data = JSON.parse(fs.readFileSync(path.resolve('data/targets-2026.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.resolve('data/targets-cell-manifest.json'), 'utf8'))
const inputFlag = process.argv.indexOf('--input')
const sourceRoot = inputFlag >= 0 ? path.resolve(process.argv[inputFlag + 1]) : process.env.TARGETS_XLS_ROOT ? path.resolve(process.env.TARGETS_XLS_ROOT) : null

assert.deepEqual(data.cellCoverage, {
  workbookCount: 3,
  sheetCount: 3,
  storedCells: 4382,
  populatedCells: 3280,
  formulaCells: 715,
  formulaErrorCells: 0,
})
assert.deepEqual(manifest.coverage, data.cellCoverage)
assert.equal(data.branches.length, 3)
assert.deepEqual(data.branches.map((branch) => branch.branch).sort(), ['Lo Beltran', 'Nueva Costanera', 'Santa María'].sort())

for (const branch of data.branches) {
  assert.equal(branch.sections.length, 7, `${branch.branch}: deben existir las siete métricas`)
  for (const section of branch.sections) {
    assert.equal(Object.keys(section.branchMonths).length, 12, `${branch.branch}/${section.metric}: faltan meses`)
    for (const partner of section.partners) assert.equal(Object.keys(partner.months).length, 12, `${branch.branch}/${section.metric}/${partner.sourceRow}: faltan meses`)
    assert.ok(section.branchAnnualValues.length >= 1, `${branch.branch}/${section.metric}: falta columna anual`)
  }
}

const unresolved = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.identityStatus === 'unresolved')))
assert.equal(unresolved.length, 4)
const colored = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.sourceColor)))
assert.equal(colored.length, 50)
const coloredIdentities = new Set(data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.sourceColor).map((partner) => `${branch.branch}:${partner.name}:${partner.sourceColor}`))))
assert.equal(coloredIdentities.size, 8)
const unmapped = data.branches.flatMap((branch) => branch.unmappedCells.map((cell) => `${branch.branch}:${cell.address}`)).sort()
assert.deepEqual(unmapped, ['Nueva Costanera:H54', 'Nueva Costanera:N122', 'Nueva Costanera:N54', 'Santa María:G104', 'Santa María:G105'].sort())

const mismatches = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.monthlyReconciliation.filter((item) => !item.exact).map((item) => ({ branch: branch.branch, metric: section.metric, ...item }))))
assert.deepEqual(mismatches, [
  { branch: 'Nueva Costanera', metric: 'stock_count', period: '2026-06', sourceTotal: 164, partnerSum: 163, delta: 1, exact: false },
  { branch: 'Nueva Costanera', metric: 'requirements_count', period: '2026-04', sourceTotal: 277.2028994152047, partnerSum: 273.20890846497844, delta: 3.993990950226248, exact: false },
  { branch: 'Nueva Costanera', metric: 'requirements_count', period: '2026-05', sourceTotal: 329.7475899061379, partnerSum: 334.2750107206175, delta: -4.527420814479626, exact: false },
  { branch: 'Nueva Costanera', metric: 'requirements_count', period: '2026-06', sourceTotal: 335.079462184874, partnerSum: 322.09515190691667, delta: 12.98431027795732, exact: false },
])

if (sourceRoot) {
  for (const workbook of manifest.workbooks) {
    const file = path.join(sourceRoot, workbook.file)
    assert.ok(fs.existsSync(file), `Falta fuente ${file}`)
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), workbook.fileSha256, `${workbook.file}: SHA binario distinto`)
    const source = XLSX.readFile(file, { cellDates: true, cellFormula: true, cellStyles: true, cellNF: true, sheetStubs: true })
    assert.deepEqual(source.SheetNames, workbook.sheets.map((sheet) => sheet.name), `${workbook.file}: hojas distintas`)
    for (const expectedSheet of workbook.sheets) {
      const sheet = source.Sheets[expectedSheet.name]
      const addresses = Object.keys(sheet).filter((address) => !address.startsWith('!')).sort((a, b) => a.localeCompare(b))
      assert.equal(addresses.length, expectedSheet.storedCells, `${workbook.file}/${expectedSheet.name}: celdas almacenadas distintas`)
      for (const expectedCell of expectedSheet.cells) {
        const cell = sheet[expectedCell.address]
        assert.ok(cell, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: celda omitida`)
        assert.deepEqual(cell.v ?? null, expectedCell.value, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: valor distinto`)
        assert.equal(cell.f ?? null, expectedCell.formula, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: fórmula distinta`)
      }
    }
  }
}

console.log(JSON.stringify({ ok: true, status: data.status, coverage: data.cellCoverage, sourceFilesReopened: Boolean(sourceRoot), issues: data.quality }, null, 2))
