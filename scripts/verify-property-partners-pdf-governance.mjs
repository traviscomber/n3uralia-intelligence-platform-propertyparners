import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'

const get = (path) => readFileSync(path, 'utf8')
const skill = get('.agents/skills/property-partners-reporting/SKILL.md')
const design = get('DESIGN.md')
const ceo = get('lib/reportin-ceo-intelligence-pdf.ts')
const house = get('lib/reportin-ceo-intelligence-pdf-house-only.ts')
const weekly = existsSync('lib/reporting/closed-period-policy.ts') ? get('lib/reporting/closed-period-policy.ts') : ''

for (const term of ['semanales y mensuales', 'último informe efectivamente cerrado', 'inspeccionar visualmente', 'todos** los KPI', '#D7332B']) {
  assert.ok(skill.includes(term), 'Missing canonical reporting rule: ' + term)
}
assert.ok(design.includes('#d7332b'), 'DESIGN.md must retain canonical red')
for (const source of [ceo, house]) {
  assert.ok(source.includes('215 / 255, 51 / 255, 43 / 255'), 'PDF must use exact canonical brand red')
}
assert.ok(ceo.includes("public/brand/property-partners-vitacura.png"), 'PDF must use approved logo')
assert.ok(ceo.includes('cover.drawImage(clientLogo'), 'PDF must embed approved logo')
assert.ok(ceo.includes('report.period.start') && ceo.includes('report.period.end') && ceo.includes('report.period.source_cutoff'), 'PDF cover must disclose true period and cutoff')
assert.ok(ceo.includes('headline_kpis'), 'PDF must draw snapshot KPI source')
assert.ok(house.includes('rebuildBenchmarkPage'), 'House-scope rendering must retain an honest market evidence page')
if (weekly) {
  for (const token of ['America/Santiago', 'lastClosedWeek', 'lastClosedMonth', 'selectLastExportable']) {
    assert.ok(weekly.includes(token), 'Closed period contract missing ' + token)
  }
}
console.log('Property Partners reporting skill/brand/cover source gate PASS')
