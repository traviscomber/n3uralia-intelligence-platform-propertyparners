import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const content = readFileSync('pnpm-lock.yaml')
const sha256 = createHash('sha256').update(content).digest('hex')
console.log(`LOCKFILE_META bytes=${content.length} sha256=${sha256}`)

try {
  execFileSync('git', ['add', 'pnpm-lock.yaml'], { stdio: 'inherit' })
  execFileSync('git', ['diff', '--cached', '--quiet'])
  console.log('LOCKFILE_ALREADY_CURRENT')
} catch {
  try {
    execFileSync('git', ['config', 'user.name', 'Vercel QA Bot'], { stdio: 'inherit' })
    execFileSync('git', ['config', 'user.email', 'noreply@vercel.com'], { stdio: 'inherit' })
    execFileSync('git', ['commit', '-m', 'Regenerate pnpm lockfile for serverless Chromium'], { stdio: 'inherit' })
    try {
      execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners.git'], { stdio: 'inherit' })
    } catch {}
    execFileSync('git', ['push', 'origin', 'HEAD:refs/heads/agent/export-regenerated-lockfile'], { stdio: 'inherit' })
    console.log('LOCKFILE_PUSH_SUCCEEDED')
  } catch (error) {
    console.log(`LOCKFILE_PUSH_UNAVAILABLE ${error instanceof Error ? error.message : String(error)}`)
  }
}
