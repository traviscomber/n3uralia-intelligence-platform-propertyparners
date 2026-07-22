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
const EXPECTED_SOURCE_HASHES = {
  'metas_mensuales_sucursal_partner_lo_beltran_2026_rev_202607.xlsx': '369905d93943dcab494878c0f9fe3a4ce34359f6b05c4c876d6a0d5e9fc3f205',
  'metas_mensuales_sucursal_partner_nueva_costanera_2026_rev_202607.xlsx': '62410258860f564dabb4280353eb0d50efb1e977d5b0aba2cddb3d10ba4aff14',
  'metas_mensuales_sucursal_partner_santa_maria_2026_rev_202607.xlsx': 'd158b6cc2b16b99a43ccdb5926cf7fd539e803729d4420db8cf81003974c05e1',
}

function rangeAddresses(range) {
  const decoded = XLSX.utils.decode_range(range.replaceAll('$', ''))
  const addresses = []
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let column = decoded.s.c; column <= decoded.e.c; column += 1) addresses.push(XLSX.utils.encode_cell({ r: row, c: column }))
  }
  return addresses
}

function formulaEvaluator(sheet) {
  const memo = new Map()
  const active = new Set()
  function evaluate(address) {
    if (memo.has(address)) return memo.get(address)
    assert.ok(!active.has(address), `Referencia circular en ${address}`)
    active.add(address)
    const cell = sheet[address]
    if (!cell?.f) {
      const value = typeof cell?.v === 'number' && Number.isFinite(cell.v) ? cell.v : 0
      memo.set(address, value)
      active.delete(address)
      return value
    }
    let expression = String(cell.f).trim().replace(/^=/, '')
    expression = expression.replace(/SUM\((\$?[A-Z]{1,3}\$?\d+):(\$?[A-Z]{1,3}\$?\d+)\)/gi, (_, start, end) => `(${rangeAddresses(`${start}:${end}`).reduce((sum, item) => sum + evaluate(item), 0)})`)
    expression = expression.replace(/\$?[A-Z]{1,3}\$?\d+/g, (reference) => String(evaluate(reference.replaceAll('$', ''))))
    assert.match(expression, /^[0-9eE+\-*/().\s]+$/, `${address}: fórmula no soportada ${cell.f}`)
    const value = Function(`"use strict"; return (${expression})`)()
    assert.ok(Number.isFinite(value), `${address}: resultado recalculado no finito`)
    memo.set(address, value)
    active.delete(address)
    return value
  }
  return evaluate
}

function displayedNumericForAudit(value, rawValue) {
  if (value === null || value === '') return null
  const normalized = String(value).replace(/[^0-9,.-]/g, '')
  const candidates = [
    Number(normalized),
    Number(normalized.replace(/,/g, '')),
    Number(normalized.replace(/\./g, '').replace(',', '.')),
  ].filter((candidate) => Number.isFinite(candidate))
  if (candidates.length === 0) return null
  if (rawValue === null) return candidates[0]
  return candidates.sort((left, right) => Math.abs(left - rawValue) - Math.abs(right - rawValue))[0]
}

assert.deepEqual(data.cellCoverage, {
  workbookCount: 3,
  sheetCount: 3,
  storedCells: 4382,
  populatedCells: 3280,
  formulaCells: 715,
  formulaErrorCells: 0,
})
assert.deepEqual(manifest.coverage, data.cellCoverage)
assert.equal(manifest.privacy.confidentialityGuaranteed, false)
assert.equal(manifest.privacy.repositoryExposure, 'public_repository')
assert.deepEqual(Object.fromEntries(manifest.workbooks.map((workbook) => [workbook.file, workbook.fileSha256])), EXPECTED_SOURCE_HASHES)
assert.equal(data.branches.length, 3)
assert.deepEqual(data.branches.map((branch) => branch.branch).sort(), ['Lo Beltran', 'Nueva Costanera', 'Santa María'].sort())

for (const branch of data.branches) {
  assert.equal(branch.sections.length, 7, `${branch.branch}: deben existir las siete métricas`)
  for (const section of branch.sections) {
    assert.equal(Object.keys(section.branchMonths).length, 12, `${branch.branch}/${section.metric}: faltan meses`)
    for (const partner of section.partners) assert.equal(Object.keys(partner.months).length, 12, `${branch.branch}/${section.metric}/${partner.sourceRow}: faltan meses`)
    assert.ok(section.branchAnnualValues.length >= 1, `${branch.branch}/${section.metric}: falta columna anual`)
    for (const reconciliation of section.monthlyReconciliation) {
      const sourceCell = section.branchMonths[reconciliation.period]
      const displayedTotal = displayedNumericForAudit(sourceCell.displayedValue, sourceCell.value)
      const displayedPartnerSum = section.partners.reduce((sum, partner) => {
        const cell = partner.months[reconciliation.period]
        return sum + (displayedNumericForAudit(cell.displayedValue, cell.value) ?? 0)
      }, 0)
      assert.equal(reconciliation.display.sourceTotal, displayedTotal, `${branch.branch}/${section.metric}/${reconciliation.period}: total visible distinto`)
      assert.ok(Math.abs(reconciliation.display.partnerSum - displayedPartnerSum) < 1e-7, `${branch.branch}/${section.metric}/${reconciliation.period}: suma visible distinta`)
      assert.ok(Math.abs(reconciliation.display.delta - (displayedTotal - displayedPartnerSum)) < 1e-7, `${branch.branch}/${section.metric}/${reconciliation.period}: delta visible distinto`)
    }
  }
}

for (const [metric, periods] of Object.entries(data.companyMonthlyTargets)) {
  for (const [period, companyTarget] of Object.entries(periods)) {
    const branchSum = data.branches.reduce((sum, branch) => sum + (branch.sections.find((section) => section.metric === metric)?.branchMonths[period]?.value ?? 0), 0)
    assert.ok(Math.abs(companyTarget - branchSum) < 1e-7, `${metric}/${period}: total compañía no reconcilia con las tres sucursales`)
  }
}

const unresolved = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.identityStatus === 'unresolved')))
assert.equal(unresolved.length, 3)
const inferred = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.identityStatus === 'inferred_from_formula')))
assert.equal(inferred.length, 1)
assert.equal(inferred[0].sourceRow, 78)
assert.equal(inferred[0].inferredName, 'Fernanada Motta Gonzalez')
assert.deepEqual(inferred[0].identityEvidence.referencedRows, [66])
const colored = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.sourceColor)))
assert.equal(colored.length, 50)
const coloredIdentities = new Set(data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.partners.filter((partner) => partner.sourceColor).map((partner) => `${branch.branch}:${partner.name}:${partner.sourceColor}`))))
assert.equal(coloredIdentities.size, 8)
const unmapped = data.branches.flatMap((branch) => branch.unmappedCells.map((cell) => `${branch.branch}:${cell.address}`)).sort()
assert.deepEqual(unmapped, ['Nueva Costanera:H54', 'Nueva Costanera:N122', 'Nueva Costanera:N54', 'Santa María:G104', 'Santa María:G105'].sort())

const mismatches = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.monthlyReconciliation.filter((item) => !item.exact).map((item) => ({ branch: branch.branch, metric: section.metric, ...item }))))
assert.deepEqual(mismatches.map(({ display, ...item }) => item), [
  { branch: 'Nueva Costanera', metric: 'stock_count', period: '2026-06', sourceTotal: 164, partnerSum: 163, delta: 1, exact: false },
  { branch: 'Nueva Costanera', metric: 'requirements_count', period: '2026-04', sourceTotal: 277.2028994152047, partnerSum: 273.20890846497844, delta: 3.993990950226248, exact: false },
  { branch: 'Nueva Costanera', metric: 'requirements_count', period: '2026-05', sourceTotal: 329.7475899061379, partnerSum: 334.2750107206175, delta: -4.527420814479626, exact: false },
  { branch: 'Nueva Costanera', metric: 'requirements_count', period: '2026-06', sourceTotal: 335.079462184874, partnerSum: 322.09515190691667, delta: 12.98431027795732, exact: false },
])
const displayRoundingDifferences = data.branches.flatMap((branch) => branch.sections.flatMap((section) => section.monthlyReconciliation.filter((item) => !item.display.exact)))
assert.equal(displayRoundingDifferences.length, 144)
assert.equal(data.quality.displayRoundingDifferenceCount, 144)
assert.equal(data.quality.fractionalMonthlyCountTargetCellCount, 1525)
assert.deepEqual(data.quality.fractionalMonthlyCountTargetsByBranch, [
  { branch: 'Lo Beltran', count: 475 },
  { branch: 'Nueva Costanera', count: 596 },
  { branch: 'Santa María', count: 454 },
])
assert.equal(data.quality.criticalCount, 4)
assert.equal(data.quality.issueCount, 27)
const parallelAnnualIssues = data.quality.issues.filter((issue) => issue.code === 'PARALLEL_ANNUAL_COLUMNS')
assert.equal(parallelAnnualIssues.length, 14)
assert.ok(parallelAnnualIssues.every((issue) => issue.annualValues.length === 2 && new Set(issue.annualValues.map((annual) => annual.value)).size === 2))

if (sourceRoot) {
  for (const workbook of manifest.workbooks) {
    const file = path.join(sourceRoot, workbook.file)
    assert.ok(fs.existsSync(file), `Falta fuente ${file}`)
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), workbook.fileSha256, `${workbook.file}: SHA binario distinto`)
    assert.equal(workbook.definedNameCount, 0, `${workbook.file}: nombres definidos inesperados`)
    assert.equal(workbook.hiddenSheetCount, 0, `${workbook.file}: hojas ocultas inesperadas`)
    const source = XLSX.readFile(file, { cellDates: true, cellFormula: true, cellStyles: true, cellNF: true, sheetStubs: true })
    assert.deepEqual(source.SheetNames, workbook.sheets.map((sheet) => sheet.name), `${workbook.file}: hojas distintas`)
    for (const expectedSheet of workbook.sheets) {
      const sheet = source.Sheets[expectedSheet.name]
      assert.deepEqual(expectedSheet.merges, ['A2:N2'], `${workbook.file}/${expectedSheet.name}: combinaciones inesperadas`)
      assert.deepEqual(expectedSheet.hiddenRows, [], `${workbook.file}/${expectedSheet.name}: filas ocultas inesperadas`)
      assert.deepEqual(expectedSheet.hiddenColumns, [], `${workbook.file}/${expectedSheet.name}: columnas ocultas inesperadas`)
      const evaluateFormula = formulaEvaluator(sheet)
      const addresses = Object.keys(sheet).filter((address) => !address.startsWith('!')).sort((a, b) => a.localeCompare(b))
      assert.equal(addresses.length, expectedSheet.storedCells, `${workbook.file}/${expectedSheet.name}: celdas almacenadas distintas`)
      for (const expectedCell of expectedSheet.cells) {
        const cell = sheet[expectedCell.address]
        assert.ok(cell, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: celda omitida`)
        assert.deepEqual(cell.v ?? null, expectedCell.value, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: valor distinto`)
        assert.equal(cell.f ?? null, expectedCell.formula, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: fórmula distinta`)
        assert.equal(cell.w ?? XLSX.utils.format_cell(cell) ?? null, expectedCell.displayedValue, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: visualización Excel distinta`)
        if (cell.f) {
          const recalculated = evaluateFormula(expectedCell.address)
          assert.ok(typeof cell.v === 'number' && Math.abs(cell.v - recalculated) < 1e-7, `${workbook.file}/${expectedSheet.name}/${expectedCell.address}: caché de fórmula distinto del recálculo`)
        }
      }
    }
  }
}

console.log(JSON.stringify({ ok: true, status: data.status, coverage: data.cellCoverage, sourceFilesReopened: Boolean(sourceRoot), issues: data.quality }, null, 2))
