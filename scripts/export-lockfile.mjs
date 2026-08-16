import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const content = readFileSync('pnpm-lock.yaml')
const encoded = content.toString('base64')
const sha256 = createHash('sha256').update(content).digest('hex')
const segmentSize = 60000
const segments = Math.ceil(encoded.length / segmentSize)

console.log(`LOCKFILE_META bytes=${content.length} sha256=${sha256} base64=${encoded.length} segments=${segments}`)
for (let index = 0; index < segments; index += 1) {
  const segment = encoded.slice(index * segmentSize, (index + 1) * segmentSize)
  console.log(`LOCKFILE_SEGMENT_${index}=${segment}`)
  if (index < segments - 1) await new Promise((resolve) => setTimeout(resolve, 2500))
}
console.log('LOCKFILE_EXPORT_COMPLETE')
