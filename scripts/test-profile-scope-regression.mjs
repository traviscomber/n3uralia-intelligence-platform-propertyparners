import fs from 'node:fs'

const route = fs.readFileSync('app/api/profile/route.ts', 'utf8')
const editor = fs.readFileSync('components/settings/ProfileEditor.tsx', 'utf8')

const checks = [
  ['profile endpoint rejects team changes', route.includes("'team' in body") && route.includes('status: 403')],
  ['profile endpoint rejects role changes', route.includes("'role' in body") && route.includes('status: 403')],
  ['profile update only writes own id', route.includes(".eq('id', user.id)")],
  ['avatar requires https', route.includes("url.protocol === 'https:'")],
  ['editor does not submit team', !editor.includes('team: form.team')],
  ['editor explains immutable scope fields', editor.includes('Equipo:') && editor.includes('administración autorizada')],
  ['editor exposes accessible error state', editor.includes('role="alert"')],
]

const failed = checks.filter(([, passed]) => !passed)
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
if (failed.length) process.exit(1)
