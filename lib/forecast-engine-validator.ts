import type { ForecastEngineState } from './forecast-engine'

export type ForecastValidationSnapshot = ForecastEngineState & {
  portalRows: number
  apartmentRows: number
  projectRows: number
  houseRows: number
  residentialCbrsRows: number
  cbrsRows: number
}

export type ForecastValidationMetrics = {
  blockingChecks: number
  confirmedPairs: number
  sourceHashes: number
  approvedVersions: number
}

export type ForecastValidationResult = {
  valid: boolean
  failures: string[]
  metrics: ForecastValidationMetrics
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/

export function validateForecastEngine(
  snapshot: ForecastValidationSnapshot,
): ForecastValidationResult {
  const failures: string[] = []
  const contract = snapshot.experimentContract

  if (contract.confirmedPairs !== 0) {
    failures.push('No Portal–CBRS pairs are currently confirmed.')
  }

  if (contract.trainingEnabled) {
    failures.push('Price training must remain disabled without confirmed pairs.')
  }

  if (snapshot.canTrainPriceModel) {
    failures.push('The Forecast Engine must not expose price training as enabled.')
  }

  if (snapshot.status !== 'research_only') {
    failures.push('The Forecast Engine must remain research_only until its gates are satisfied.')
  }

  if (
    contract.segments.length !== 2 ||
    contract.segments[0] !== 'apartment' ||
    contract.segments[1] !== 'house'
  ) {
    failures.push('Houses and apartments must remain separate segments.')
  }

  if (contract.splitStrategy !== 'temporal') {
    failures.push('Model validation must use a temporal split.')
  }

  if (contract.target !== 'registered_sale_price_uf') {
    failures.push('The forecast target must remain registered_sale_price_uf.')
  }

  if (contract.baseline !== 'property_partners_excel_rules') {
    failures.push('Every challenger must retain the Excel rules as baseline.')
  }

  if (contract.activation !== 'professional_approval_required') {
    failures.push('Forecast activation must require professional approval.')
  }

  if (contract.sourceHashes.length !== 7) {
    failures.push('The contract must fingerprint five market sources and two valuation templates.')
  }

  if (new Set(contract.sourceHashes).size !== contract.sourceHashes.length) {
    failures.push('Every forecast source fingerprint must be unique.')
  }

  if (!contract.sourceHashes.every((hash) => SHA256_PATTERN.test(hash))) {
    failures.push('Every forecast source fingerprint must be a lowercase SHA256 hash.')
  }

  if (
    snapshot.portalRows !==
    snapshot.apartmentRows + snapshot.projectRows + snapshot.houseRows
  ) {
    failures.push('Portal segment rows must reconcile to the source total.')
  }

  if (snapshot.residentialCbrsRows > snapshot.cbrsRows) {
    failures.push('Residential CBRS assets cannot exceed all CBRS assets.')
  }

  if (snapshot.blockingChecks <= 0) {
    failures.push('Incomplete evidence must keep at least one blocking gate visible.')
  }

  if (snapshot.approvedVersions !== 0) {
    failures.push('No forecast model version may be approved before professional review.')
  }

  return {
    valid: failures.length === 0,
    failures,
    metrics: {
      blockingChecks: snapshot.blockingChecks,
      confirmedPairs: contract.confirmedPairs,
      sourceHashes: contract.sourceHashes.length,
      approvedVersions: snapshot.approvedVersions,
    },
  }
}
