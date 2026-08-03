import fs from 'node:fs'

const snapshot = JSON.parse(fs.readFileSync('config/contract-closeout-snapshot.json', 'utf8'))
const acceptance = JSON.parse(fs.readFileSync('config/client-acceptance-status.json', 'utf8'))
const readiness = JSON.parse(fs.readFileSync('config/production-readiness-status.json', 'utf8'))

if (snapshot.schemaVersion !== 1) throw new Error('Unsupported closeout snapshot schemaVersion')
if (snapshot.clientAcceptance !== acceptance.overallStatus) throw new Error('Snapshot clientAcceptance does not match acceptance register')
if (snapshot.productionReadiness !== readiness.status) throw new Error('Snapshot productionReadiness does not match readiness register')
if (!Number.isInteger(snapshot.clientDependenciesOpen) || snapshot.clientDependenciesOpen < 0) throw new Error('Invalid clientDependenciesOpen')
if (!Number.isInteger(snapshot.criticalFindingsOpen) || snapshot.criticalFindingsOpen < 0) throw new Error('Invalid criticalFindingsOpen')
if (!Number.isInteger(snapshot.highFindingsOpen) || snapshot.highFindingsOpen < 0) throw new Error('Invalid highFindingsOpen')

if (snapshot.contractStatus === 'closed') {
  if (snapshot.clientAcceptance !== 'accepted' && snapshot.clientAcceptance !== 'accepted-with-observations') throw new Error('Closed contract requires client acceptance')
  if (snapshot.productionReadiness !== 'ready') throw new Error('Closed contract requires production readiness')
  if (snapshot.uat !== 'accepted') throw new Error('Closed contract requires accepted UAT')
  if (snapshot.training !== 'completed' && snapshot.training !== 'waived') throw new Error('Closed contract requires completed or waived training')
  if (snapshot.deliveryPackage !== 'ready') throw new Error('Closed contract requires ready delivery package')
  if (snapshot.criticalFindingsOpen > 0 || snapshot.highFindingsOpen > 0) throw new Error('Closed contract cannot contain critical or high findings')
  if (!snapshot.commit || !/^https:\/\//.test(snapshot.deployment ?? '')) throw new Error('Closed contract requires commit and HTTPS deployment')
}

console.log(`Contract closeout snapshot verified: ${snapshot.contractStatus}`)
