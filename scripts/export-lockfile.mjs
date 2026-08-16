import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const content = readFileSync('pnpm-lock.yaml')
const encoded = content.toString('base64')
const chunkSize = 5000
const chunks = Math.ceil(encoded.length / chunkSize)
const sha256 = createHash('sha256').update(content).digest('hex')

console.log(`LOCKFILE_META bytes=${content.length} sha256=${sha256} base64=${encoded.length} chunks=${chunks}`)
for (let index = 0; index < chunks; index += 1) {
  const chunk = encoded.slice(index * chunkSize, (index + 1) * chunkSize)
  console.log(`LOCKFILE_CHUNK_${String(index).padStart(3, '0')}=${chunk}`)
}
console.log('LOCKFILE_EXPORT_COMPLETE')
