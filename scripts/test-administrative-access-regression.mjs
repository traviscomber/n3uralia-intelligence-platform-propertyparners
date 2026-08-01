import fs from 'node:fs'

const checks = [
  {
    file: 'app/dashboard/properties/admin/page.tsx',
    required: [
      "requireAnyPageCapability(['properties.global.assign', 'properties.office.assign'])",
      'assertProfileVisible(scope, assignedTo)',
      'assertProfileVisible(scope, assignment.assigned_to)',
      ".in('assigned_to', visibleProfiles)",
      'role="alert"',
      'role="status"',
    ],
    forbidden: ['LEADERSHIP_ROLES', "select('role').eq('id'"],
  },
  {
    file: 'app/dashboard/settings/layout.tsx',
    required: ["requirePageCapability('settings.manage')"],
    forbidden: ["requirePageCapability('users.manage')"],
  },
]

let failed = false
for (const check of checks) {
  const source = fs.readFileSync(check.file, 'utf8')
  for (const token of check.required) {
    if (!source.includes(token)) {
      console.error(`FAIL ${check.file}: missing ${token}`)
      failed = true
    }
  }
  for (const token of check.forbidden) {
    if (source.includes(token)) {
      console.error(`FAIL ${check.file}: forbidden ${token}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log('Administrative access regression checks passed.')
