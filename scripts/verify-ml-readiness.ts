import { validateForecastEngine } from '../lib/forecast-engine-validator'
import { getMlLabSnapshot } from '../lib/ml-lab'

const result = validateForecastEngine(getMlLabSnapshot())

if (!result.valid) {
  for (const failure of result.failures) {
    console.error(`- ${failure}`)
  }

  process.exitCode = 1
} else {
  const { blockingChecks, confirmedPairs, sourceHashes, approvedVersions } = result.metrics

  console.log(
    `Forecast readiness verified: ${blockingChecks} blocking gates, ${confirmedPairs} confirmed pairs, ${sourceHashes} immutable source hashes, ${approvedVersions} approved versions.`,
  )
}
