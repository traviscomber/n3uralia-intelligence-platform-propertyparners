#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import XLSX from 'xlsx'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const METRICS = {
  cartera: { id: 'stock_count', label: 'Cartera', unit: 'properties', annualRule: 'ending_balance' },
  requerimientos: { id: 'requirements_count', label: 'Requerimientos', unit: 'count', annualRule: 'sum' },
  leads: { id: 'leads_count', label: 'Leads', unit: 'count', annualRule: 'sum' },
  visitas: { id: 'visits_count', label: 'Visitas', unit: 'count', annualRule: 'sum' },
  ofertas: { id: 'offers_count', label: 'Ofertas', unit: 'count', annualRule: 'sum' },
  cierres: { id: 'sales_count', label: 'Cierres', unit: 'count', annualRule: 'sum' },
  'cierres uf': { id: 'sales_uf', label: 'Cierres UF', unit: 'uf', annualRule: 'sum' },
}

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (flag) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : null
  }
  const input = value('--input') || process.env.TARGETS_XLS_ROOT
  if (!input) throw new Error('Use --input <Metas 2026/raw> or define TARGETS_XLS_ROOT.')
  return {
    input: path.resolve(input),
    output: path.resolve(value('--output') || 'data/targets-2026.json'),
    manifestOutput: path.resolve(value('--manifest-output') || 'data/targets-cell-manifest.json'),
  }
}

function normalize(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function stableValue(value) {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function numeric(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function almostEqual(left, right) {
  return left !== null && right !== null && Math.abs(left - right) < 1e-7
}

function branchFromTitle(matrix) {
  const title = matrix.flat().find((value) => typeof value === 'string' && /^Metas\s+/i.test(value))
  return String(title ?? '').replace(/^Metas\s+/i, '').trim()
}

function metricFromTitle(row) {
  const title = row.find((value) => typeof value === 'string' && /^Meta(?:s)?\s+/i.test(value))
  if (!title) return null
  const key = normalize(title).replace(/^metas?\s+/, '')
  return METRICS[key] ? { ...METRICS[key], sourceTitle: title } : null
}

function sourceColor(cell) {
  const rgb = cell?.s?.fgColor?.rgb || cell?.s?.fill?.fgColor?.rgb
  if (!rgb) return null
  const normalized = rgb.slice(-6).toUpperCase()
  if (normalized === '92D050') return 'green'
  if (normalized === 'FF0000') return 'red'
  return normalized
}

function displayedValue(cell) {
  if (!cell) return null
  return cell.w ?? XLSX.utils.format_cell(cell) ?? null
}

function displayedNumeric(value, rawValue) {
  if (value === null || value === '') return null
  const normalized = String(value).replace(/[^0-9,.-]/g, '')
  if (!normalized) return null
  const candidates = [
    Number(normalized),
    Number(normalized.replace(/,/g, '')),
    Number(normalized.replace(/\./g, '').replace(',', '.')),
  ].filter((candidate) => Number.isFinite(candidate))
  if (candidates.length === 0) return null
  if (rawValue === null) return candidates[0]
  return candidates.sort((left, right) => Math.abs(left - rawValue) - Math.abs(right - rawValue))[0]
}

function buildSourceAudit(file, root) {
  const workbook = XLSX.readFile(file, { cellDates: true, cellFormula: true, cellStyles: true, cellNF: true, sheetStubs: true })
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const addresses = Object.keys(sheet).filter((address) => !address.startsWith('!')).sort((a, b) => a.localeCompare(b))
    const digest = crypto.createHash('sha256')
    const cells = addresses.map((address) => {
      const cell = sheet[address]
      digest.update(JSON.stringify([address, stableValue(cell)]))
      return {
        address,
        value: stableValue(cell?.v ?? null),
        displayedValue: displayedValue(cell),
        formula: cell?.f ?? null,
        type: cell?.t ?? null,
        numberFormat: cell?.z ?? null,
        styleId: cell?.s ?? null,
        fill: sourceColor(cell),
      }
    })
    return {
      name,
      range: sheet['!ref'] ?? null,
      storedCells: addresses.length,
      populatedCells: cells.filter((cell) => cell.value !== null || cell.formula).length,
      formulaCells: cells.filter((cell) => cell.formula).length,
      formulaErrorCells: cells.filter((cell) => cell.type === 'e').length,
      merges: (sheet['!merges'] ?? []).map((range) => XLSX.utils.encode_range(range)),
      hiddenRows: (sheet['!rows'] ?? []).flatMap((row, index) => row?.hidden ? [index + 1] : []),
      hiddenColumns: (sheet['!cols'] ?? []).flatMap((column, index) => column?.hidden ? [XLSX.utils.encode_col(index)] : []),
      cellDigest: digest.digest('hex'),
      cells,
    }
  })
  return {
    file: path.relative(root, file).replaceAll('\\', '/'),
    byteSize: fs.statSync(file).size,
    fileSha256: sha256(fs.readFileSync(file)),
    sheetCount: sheets.length,
    storedCells: sheets.reduce((sum, sheet) => sum + sheet.storedCells, 0),
    populatedCells: sheets.reduce((sum, sheet) => sum + sheet.populatedCells, 0),
    formulaCells: sheets.reduce((sum, sheet) => sum + sheet.formulaCells, 0),
    formulaErrorCells: sheets.reduce((sum, sheet) => sum + sheet.formulaErrorCells, 0),
    definedNameCount: workbook.Workbook?.Names?.length ?? 0,
    hiddenSheetCount: workbook.Workbook?.Sheets?.filter((sheet) => sheet.Hidden).length ?? 0,
    sheets,
  }
}

function parseWorkbook(file, root) {
  const workbook = XLSX.readFile(file, { cellDates: true, cellFormula: true, cellStyles: true, cellNF: true, sheetStubs: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
  const branch = branchFromTitle(matrix)
  const sections = []
  const mapped = new Set()
  const branchTitleRow = matrix.findIndex((row) => row.some((value) => typeof value === 'string' && /^Metas\s+/i.test(value)))
  if (branchTitleRow >= 0) matrix[branchTitleRow].forEach((value, column) => { if (value !== null) mapped.add(XLSX.utils.encode_cell({ r: branchTitleRow, c: column })) })

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const metric = metricFromTitle(matrix[rowIndex])
    if (!metric) continue
    const headerIndex = rowIndex + 1
    const headers = matrix[headerIndex] ?? []
    const monthColumns = MONTHS.map((month) => headers.findIndex((header) => normalize(header) === normalize(month)))
    const annualColumns = headers.map((header, column) => ({ header, column })).filter(({ header }) => /^(meta|total) anual$/i.test(normalize(header)))
    if (monthColumns.some((column) => column < 0)) throw new Error(`${path.basename(file)} ${metric.label}: missing month column.`)

    let totalRowIndex = -1
    for (let candidate = headerIndex + 1; candidate < matrix.length; candidate += 1) {
      if (normalize(matrix[candidate]?.[0]).startsWith('total partners')) {
        totalRowIndex = candidate
        break
      }
      if (candidate > headerIndex + 1 && metricFromTitle(matrix[candidate] ?? [])) break
    }
    if (totalRowIndex < 0) throw new Error(`${path.basename(file)} ${metric.label}: missing branch total.`)
    const partnerSourceRows = Array.from({ length: totalRowIndex - headerIndex - 1 }, (_, offset) => headerIndex + 1 + offset)
      .filter((sourceRow) => matrix[sourceRow].some((value) => value !== null && value !== ''))
    const partnerRows = partnerSourceRows.map((sourceRow) => matrix[sourceRow])
    const totalRow = matrix[totalRowIndex]

    for (let sourceRow = rowIndex; sourceRow <= totalRowIndex; sourceRow += 1) {
      for (let column = 0; column < matrix[sourceRow].length; column += 1) {
        if (matrix[sourceRow][column] !== null && matrix[sourceRow][column] !== '') mapped.add(XLSX.utils.encode_cell({ r: sourceRow, c: column }))
      }
    }

    const partners = partnerRows.map((row, partnerOffset) => {
      const sourceRow = partnerSourceRows[partnerOffset] + 1
      const name = row[0] === null ? null : String(row[0]).trim()
      const months = Object.fromEntries(MONTHS.map((month, monthIndex) => [
        `2026-${String(monthIndex + 1).padStart(2, '0')}`,
        {
          value: numeric(row[monthColumns[monthIndex]]),
          cell: XLSX.utils.encode_cell({ r: sourceRow - 1, c: monthColumns[monthIndex] }),
          formula: sheet[XLSX.utils.encode_cell({ r: sourceRow - 1, c: monthColumns[monthIndex] })]?.f ?? null,
          displayedValue: displayedValue(sheet[XLSX.utils.encode_cell({ r: sourceRow - 1, c: monthColumns[monthIndex] })]),
        },
      ]))
      const annualValues = annualColumns.map(({ header, column }) => ({
        header: String(header),
        column: XLSX.utils.encode_col(column),
        cell: XLSX.utils.encode_cell({ r: sourceRow - 1, c: column }),
        value: numeric(row[column]),
        formula: sheet[XLSX.utils.encode_cell({ r: sourceRow - 1, c: column })]?.f ?? null,
        displayedValue: displayedValue(sheet[XLSX.utils.encode_cell({ r: sourceRow - 1, c: column })]),
      }))
      return {
        sourceRow,
        name,
        identityStatus: !name || normalize(name) === 'nn' ? 'unresolved' : 'named',
        sourceColor: sourceColor(sheet[`A${sourceRow}`]),
        months,
        annualValues,
      }
    })

    const branchMonths = Object.fromEntries(MONTHS.map((month, monthIndex) => [
      `2026-${String(monthIndex + 1).padStart(2, '0')}`,
      {
        value: numeric(totalRow[monthColumns[monthIndex]]),
        cell: XLSX.utils.encode_cell({ r: totalRowIndex, c: monthColumns[monthIndex] }),
        formula: sheet[XLSX.utils.encode_cell({ r: totalRowIndex, c: monthColumns[monthIndex] })]?.f ?? null,
        displayedValue: displayedValue(sheet[XLSX.utils.encode_cell({ r: totalRowIndex, c: monthColumns[monthIndex] })]),
      },
    ]))
    const monthlyReconciliation = MONTHS.map((month, monthIndex) => {
      const period = `2026-${String(monthIndex + 1).padStart(2, '0')}`
      const sourceTotal = branchMonths[period].value
      const partnerSum = partners.reduce((sum, partner) => sum + (partner.months[period].value ?? 0), 0)
      const sourceDisplayedTotal = displayedNumeric(branchMonths[period].displayedValue, sourceTotal)
      const partnerDisplayedSum = partners.reduce((sum, partner) => {
        const cell = partner.months[period]
        return sum + (displayedNumeric(cell.displayedValue, cell.value) ?? 0)
      }, 0)
      return {
        period,
        sourceTotal,
        partnerSum,
        delta: sourceTotal === null ? null : sourceTotal - partnerSum,
        exact: almostEqual(sourceTotal, partnerSum),
        display: {
          sourceTotal: sourceDisplayedTotal,
          partnerSum: partnerDisplayedSum,
          delta: sourceDisplayedTotal === null ? null : sourceDisplayedTotal - partnerDisplayedSum,
          exact: almostEqual(sourceDisplayedTotal, partnerDisplayedSum),
        },
      }
    })

    sections.push({
      metric: metric.id,
      label: metric.label,
      unit: metric.unit,
      annualRule: metric.annualRule,
      sourceTitle: metric.sourceTitle,
      sourceRange: `A${rowIndex + 1}:${XLSX.utils.encode_col(Math.max(...monthColumns, ...annualColumns.map(({ column }) => column), 0))}${totalRowIndex + 1}`,
      headerRow: headerIndex + 1,
      partnerCount: partners.length,
      partners,
      branchMonths,
      branchAnnualValues: annualColumns.map(({ header, column }) => ({
        header: String(header),
        column: XLSX.utils.encode_col(column),
        cell: XLSX.utils.encode_cell({ r: totalRowIndex, c: column }),
        value: numeric(totalRow[column]),
        formula: sheet[XLSX.utils.encode_cell({ r: totalRowIndex, c: column })]?.f ?? null,
        displayedValue: displayedValue(sheet[XLSX.utils.encode_cell({ r: totalRowIndex, c: column })]),
      })),
      monthlyReconciliation,
      allMonthlyTotalsExact: monthlyReconciliation.every((item) => item.exact),
    })
  }

  const namedRows = new Map(sections.flatMap((section) => section.partners.filter((partner) => partner.identityStatus === 'named').map((partner) => [partner.sourceRow, partner.name])))
  for (const section of sections) {
    for (const partner of section.partners.filter((item) => item.identityStatus === 'unresolved')) {
      const formulaCells = [
        ...Object.values(partner.months).map((month) => ({ cell: month.cell, formula: month.formula })),
        ...partner.annualValues.map((annual) => ({ cell: annual.cell, formula: annual.formula })),
      ].filter((item) => item.formula)
      const referencedRows = [...new Set(formulaCells.flatMap((item) => [...String(item.formula).matchAll(/\$?[A-Z]{1,3}\$?(\d+)/g)].map((match) => Number(match[1]))))]
      const inferredNames = [...new Set(referencedRows.map((row) => namedRows.get(row)).filter(Boolean))]
      if (inferredNames.length === 1) {
        partner.identityStatus = 'inferred_from_formula'
        partner.inferredName = inferredNames[0]
        partner.identityEvidence = { type: 'formula_reference', referencedRows: referencedRows.filter((row) => namedRows.get(row) === inferredNames[0]), cells: formulaCells.filter((item) => item.formula && referencedRows.some((row) => namedRows.get(row) === inferredNames[0] && new RegExp(`\\$?[A-Z]{1,3}\\$?${row}(?!\\d)`).test(item.formula))).map((item) => ({ cell: item.cell, formula: item.formula })) }
      }
    }
  }

  const sourceAudit = buildSourceAudit(file, root)
  const nonEmptyCells = sourceAudit.sheets[0].cells.filter((cell) => cell.value !== null || cell.formula)
  const unmappedCells = nonEmptyCells.filter((cell) => !mapped.has(cell.address))
  return { branch, file: path.basename(file), sheet: sheetName, sections, unmappedCells, sourceAudit }
}

function main() {
  const { input, output, manifestOutput } = parseArgs()
  const files = fs.readdirSync(input).filter((name) => name.toLowerCase().endsWith('.xlsx')).sort().map((name) => path.join(input, name))
  if (files.length !== 3) throw new Error(`Expected exactly three target workbooks, found ${files.length}.`)
  const branches = files.map((file) => parseWorkbook(file, input))
  const generatedAt = new Date().toISOString()
  const metricIds = Object.values(METRICS).map((metric) => metric.id)
  const periods = MONTHS.map((_, index) => `2026-${String(index + 1).padStart(2, '0')}`)

  const companyMonthlyTargets = Object.fromEntries(metricIds.map((metric) => [metric, Object.fromEntries(periods.map((period) => {
    const values = branches.map((branch) => branch.sections.find((section) => section.metric === metric)?.branchMonths[period].value ?? null)
    return [period, values.every((value) => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null]
  }))]))

  const qualityIssues = []
  for (const branch of branches) {
    for (const section of branch.sections) {
      for (const mismatch of section.monthlyReconciliation.filter((item) => !item.exact)) {
        qualityIssues.push({
          severity: 'critical',
          code: 'MONTHLY_TOTAL_MISMATCH',
          branch: branch.branch,
          metric: section.metric,
          period: mismatch.period,
          sourceTotal: mismatch.sourceTotal,
          partnerSum: mismatch.partnerSum,
          delta: mismatch.delta,
          detail: `La suma de partners no coincide con el total mensual de sucursal en ${mismatch.period}.`,
        })
      }
      if (section.branchAnnualValues.length > 1) {
        const partnerRowsWithDifferentAnnualValues = section.partners.filter((partner) => new Set(partner.annualValues.map((annual) => annual.value)).size > 1).length
        const partnerRowsLabel = partnerRowsWithDifferentAnnualValues === 1 ? '1 fila de partner' : `${partnerRowsWithDifferentAnnualValues} filas de partner`
        const annualValues = section.branchAnnualValues.map((annual) => ({ cell: annual.cell, value: annual.value, formula: annual.formula }))
        qualityIssues.push({
          severity: 'warning',
          code: 'PARALLEL_ANNUAL_COLUMNS',
          branch: branch.branch,
          metric: section.metric,
          annualValues,
          partnerRowsWithDifferentAnnualValues,
          detail: `La fuente contiene ${section.branchAnnualValues.length} columnas anuales paralelas con totales de sucursal diferentes y ${partnerRowsLabel} con valores diferentes; todas se preservan.`,
        })
      }
      for (const partner of section.partners.filter((item) => item.identityStatus === 'unresolved')) {
        qualityIssues.push({ severity: 'warning', code: 'UNRESOLVED_PARTNER_IDENTITY', branch: branch.branch, metric: section.metric, sourceRow: partner.sourceRow, detail: `La fila ${partner.sourceRow} no contiene una identidad de partner resoluble.` })
      }
      for (const partner of section.partners.filter((item) => item.identityStatus === 'inferred_from_formula')) {
        qualityIssues.push({ severity: 'warning', code: 'INFERRED_PARTNER_IDENTITY', branch: branch.branch, metric: section.metric, sourceRow: partner.sourceRow, inferredName: partner.inferredName, evidence: partner.identityEvidence, detail: `La fila ${partner.sourceRow} no tiene nombre fuente; la identidad ${partner.inferredName} se infiere únicamente por referencias de fórmula y no reemplaza el valor original.` })
      }
    }
    for (const cell of branch.unmappedCells) qualityIssues.push({ severity: 'warning', code: 'UNMAPPED_SOURCE_CELL', branch: branch.branch, cell: cell.address, value: cell.value, formula: cell.formula, detail: 'Celda con contenido fuera de los bloques mensuales detectados; se preserva sin asignarla a una métrica.' })
  }

  const cellCoverage = {
    workbookCount: branches.length,
    sheetCount: branches.reduce((sum, branch) => sum + branch.sourceAudit.sheetCount, 0),
    storedCells: branches.reduce((sum, branch) => sum + branch.sourceAudit.storedCells, 0),
    populatedCells: branches.reduce((sum, branch) => sum + branch.sourceAudit.populatedCells, 0),
    formulaCells: branches.reduce((sum, branch) => sum + branch.sourceAudit.formulaCells, 0),
    formulaErrorCells: branches.reduce((sum, branch) => sum + branch.sourceAudit.formulaErrorCells, 0),
  }
  const displayRoundingDifferences = branches.flatMap((branch) => branch.sections.flatMap((section) => section.monthlyReconciliation.filter((item) => !item.display.exact)))
  const fractionalMonthlyCountTargetsByBranch = branches.map((branch) => ({
    branch: branch.branch,
    count: branch.sections.filter((section) => section.unit !== 'uf').reduce((count, section) => {
      const branchCount = Object.values(section.branchMonths).filter((cell) => typeof cell.value === 'number' && !Number.isInteger(cell.value)).length
      const partnerCount = section.partners.reduce((sum, partner) => sum + Object.values(partner.months).filter((cell) => typeof cell.value === 'number' && !Number.isInteger(cell.value)).length, 0)
      return count + branchCount + partnerCount
    }, 0),
  }))

  const payload = {
    schemaVersion: 1,
    generatedAt,
    version: '202607',
    status: qualityIssues.some((issue) => issue.severity === 'critical') ? 'loaded_with_critical_issues' : 'loaded_with_source_issues',
    scope: { year: 2026, commune: 'Vitacura', branches: branches.map((branch) => branch.branch), piiIncluded: true, access: 'authenticated_dashboard_intent', repositoryExposure: 'public_repository' },
    rules: {
      monthlyValues: 'Every January-December source cell is retained exactly, including null and zero.',
      annualValues: 'Every annual source column is retained independently. No annual column is discarded or silently promoted over another.',
      compliance: 'Compliance is calculated only from a compatible CRM actual and the same branch, metric and month.',
    },
    cellCoverage,
    companyMonthlyTargets,
    branches: branches.map(({ sourceAudit, ...branch }) => branch),
    quality: {
      issueCount: qualityIssues.length,
      criticalCount: qualityIssues.filter((issue) => issue.severity === 'critical').length,
      displayRoundingDifferenceCount: displayRoundingDifferences.length,
      fractionalMonthlyCountTargetCellCount: fractionalMonthlyCountTargetsByBranch.reduce((sum, branch) => sum + branch.count, 0),
      fractionalMonthlyCountTargetsByBranch,
      issues: qualityIssues,
    },
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt,
    coverage: cellCoverage,
    privacy: { rawValuesIncluded: true, containsEmployeeNames: true, access: 'authenticated_dashboard_intent', repositoryExposure: 'public_repository', confidentialityGuaranteed: false },
    workbooks: branches.map((branch) => branch.sourceAudit),
  }

  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.mkdirSync(path.dirname(manifestOutput), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  fs.writeFileSync(manifestOutput, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ output, manifestOutput, status: payload.status, coverage: cellCoverage, branches: payload.scope.branches, quality: payload.quality }, null, 2))
}

main()
