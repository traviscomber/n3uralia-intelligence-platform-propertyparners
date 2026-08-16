import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const content = readFileSync('pnpm-lock.yaml')
const encoded = content.toString('base64')
const sha256 = createHash('sha256').update(content).digest('hex')
const routeDir = 'app/api/qa/lockfile-export'
const routePath = `${routeDir}/route.ts`

mkdirSync(routeDir, { recursive: true })
writeFileSync(
  routePath,
  `export const dynamic = 'force-dynamic'\nconst encoded = ${JSON.stringify(encoded)}\nexport async function GET(request: Request) {\n  if (process.env.VERCEL_ENV !== 'preview') return new Response('Not found', { status: 404 })\n  const url = new URL(request.url)\n  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0)\n  const length = Math.min(80000, Math.max(1, Number.parseInt(url.searchParams.get('length') || '80000', 10) || 80000))\n  return new Response(encoded.slice(offset, offset + length), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })\n}\n`,
)

console.log(`LOCKFILE_META bytes=${content.length} sha256=${sha256} base64=${encoded.length}`)
console.log('LOCKFILE_EXPORT_ROUTE_READY')
