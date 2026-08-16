import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const content = readFileSync('pnpm-lock.yaml')
const encoded = content.toString('base64')
const sha256 = createHash('sha256').update(content).digest('hex')

console.log(`LOCKFILE_META bytes=${content.length} sha256=${sha256} base64=${encoded.length}`)
console.log(`LOCKFILE_FULL=${encoded}`)
console.log('LOCKFILE_EXPORT_COMPLETE')
