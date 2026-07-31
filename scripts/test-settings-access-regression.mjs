import fs from 'node:fs'

const route = fs.readFileSync('app/api/report-delivery-targets/route.ts', 'utf8')
const layout = fs.readFileSync('app/dashboard/settings/layout.tsx', 'utf8')

const checks = [
  ['delivery API uses settings.manage', route.includes("requireCapability('settings.manage')")],
  ['legacy executive access removed', !route.includes('requireExecutiveAccess')],
  ['access errors use central response', route.includes('accessErrorResponse')],
  ['invalid webhook is rejected', route.includes('El webhook debe usar HTTPS')],
  ['missing update target returns 404', route.includes('Destinatario no encontrado')],
  ['settings layout uses settings.manage', layout.includes("requirePageCapability('settings.manage')")],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
if (failed.length) process.exit(1)
