export type ForecastWindow = '30d' | '60d' | '90d'

export type ForecastResult = {
  window: ForecastWindow
  confidence: number
  opportunities: string[]
  risks: string[]
  recommendedActions: string[]
}

export type ForecastEngineStatus = 'research_only' | 'training_ready' | 'active'
export type ForecastCheckStatus = 'ready' | 'partial' | 'blocked'

export type ForecastReadinessCheck = {
  label: string
  status: ForecastCheckStatus
  blocksTraining: boolean
}

export type ForecastExperimentContract = {
  version: '1.0.0'
  target: 'registered_sale_price_uf'
  segments: readonly ['apartment', 'house']
  splitStrategy: 'temporal'
  baseline: 'property_partners_excel_rules'
  sourceHashes: string[]
  confirmedPairs: number
  trainingEnabled: boolean
  activation: 'professional_approval_required'
}

export type ForecastEngineInput = {
  sourceHashes: string[]
  confirmedPairs: number
  checks: ForecastReadinessCheck[]
  modelVersions?: number
  approvedVersions?: number
}

export type ForecastEngineState = {
  status: ForecastEngineStatus
  canTrainPriceModel: boolean
  modelVersions: number
  approvedVersions: number
  blockingChecks: number
  experimentContract: ForecastExperimentContract
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/

export function buildForecastExperimentContract(
  sourceHashes: string[],
  confirmedPairs: number,
): ForecastExperimentContract {
  const immutableHashes = [...sourceHashes]
  const hasValidSources =
    immutableHashes.length > 0 &&
    immutableHashes.every((hash) => SHA256_PATTERN.test(hash)) &&
    new Set(immutableHashes).size === immutableHashes.length

  return {
    version: '1.0.0',
    target: 'registered_sale_price_uf',
    segments: ['apartment', 'house'],
    splitStrategy: 'temporal',
    baseline: 'property_partners_excel_rules',
    sourceHashes: immutableHashes,
    confirmedPairs,
    trainingEnabled: confirmedPairs > 0 && hasValidSources,
    activation: 'professional_approval_required',
  }
}

export function buildForecastEngineState(input: ForecastEngineInput): ForecastEngineState {
  const modelVersions = input.modelVersions ?? 0
  const approvedVersions = input.approvedVersions ?? 0
  const experimentContract = buildForecastExperimentContract(
    input.sourceHashes,
    input.confirmedPairs,
  )
  const blockingChecks = input.checks.filter(
    (check) => check.blocksTraining && check.status !== 'ready',
  ).length
  const canTrainPriceModel = experimentContract.trainingEnabled && blockingChecks === 0

  let status: ForecastEngineStatus = 'research_only'
  if (canTrainPriceModel) status = 'training_ready'
  if (canTrainPriceModel && approvedVersions > 0) status = 'active'

  return {
    status,
    canTrainPriceModel,
    modelVersions,
    approvedVersions,
    blockingChecks,
    experimentContract,
  }
}

export function buildExecutiveForecast(input: {
  portfolioHealth: number
  salesVelocity: number
  inventoryPressure: number
}): ForecastResult[] {
  const confidence = Math.max(
    0,
    Math.min(100, Math.round((input.portfolioHealth + input.salesVelocity) / 2)),
  )

  return [
    {
      window: '30d',
      confidence,
      opportunities: [
        'Prioritize active opportunities with highest conversion probability',
      ],
      risks: [
        input.inventoryPressure > 70
          ? 'High inventory pressure requires intervention'
          : 'Monitor inventory evolution',
      ],
      recommendedActions: [
        'Review priority assets and executive pipeline',
      ],
    },
    {
      window: '60d',
      confidence: Math.max(0, confidence - 5),
      opportunities: ['Expand strategic opportunities based on market signals'],
      risks: ['Validate trend persistence with new evidence'],
      recommendedActions: ['Adjust portfolio strategy'],
    },
    {
      window: '90d',
      confidence: Math.max(0, confidence - 10),
      opportunities: ['Prepare board-level strategic decisions'],
      risks: ['Long-term market uncertainty'],
      recommendedActions: ['Generate executive scenario planning'],
    },
  ]
}
