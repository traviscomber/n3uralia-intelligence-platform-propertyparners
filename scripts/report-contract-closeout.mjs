import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/contract-closeout-status.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const workstreams = manifest.workstreams ?? []
const statusCounts = Object.fromEntries(
  (manifest.allowedStatuses ?? []).map((status) => [
    status,
    workstreams.filter((workstream) => workstream.status === status).length,
  ]),
)
const blockers = workstreams.flatMap((workstream) =>
  (workstream.blockers ?? []).map((blocker) => ({
    workstream: workstream.id,
    owner: workstream.owner,
    blocker,
  })),
)

console.log('Contract closeout status')
console.log(`As of: ${manifest.asOf}`)
console.log(`Overall status: ${manifest.overallStatus}`)
console.log(`Workstreams: ${workstreams.length}`)
for (const [status, count] of Object.entries(statusCounts)) {
  console.log(`- ${status}: ${count}`)
}
console.log(`Open blockers: ${blockers.length}`)
for (const item of blockers) {
  console.log(`- ${item.workstream} [${item.owner}]: ${item.blocker}`)
}

const accepted = workstreams.filter((workstream) => workstream.status === 'accepted').length
const readyForUat = workstreams.filter((workstream) => workstream.status === 'ready-for-uat').length
console.log(`Accepted workstreams: ${accepted}/${workstreams.length}`)
console.log(`Ready for UAT: ${readyForUat}/${workstreams.length}`)
