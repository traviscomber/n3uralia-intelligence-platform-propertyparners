export const VALUATION_CONDITION_VERSION = 'condition-assessment-v1'

export type ConditionLevel = 1 | 2 | 3 | 4 | 5
export type ConditionStatus = 'critical' | 'deficient' | 'regular' | 'good' | 'excellent' | 'not_evaluable'
export type EvidenceKind = 'photo' | 'document' | 'inspection_note' | 'technical_report' | 'dom_permit' | 'final_reception' | 'sii_record' | 'listing'
export type TransformationStatus = 'unknown' | 'no_evidence' | 'weak_evidence' | 'verified'

export type ConditionEvidence = {
  kind: EvidenceKind
  reference: string
  observedAt?: string | null
  note?: string | null
}

export type TransformationEvidence = {
  status: TransformationStatus
  effectiveDate?: string | null
  builtAreaOverrideM2?: number | null
  constructionYearOverride?: number | null
  summary?: string | null
  sources: ConditionEvidence[]
}

export type ConditionCriterionCode =
  | 'structure_envelope'
  | 'moisture_insulation'
  | 'installations'
  | 'kitchen_bathrooms'
  | 'finishes_carpentry'
  | 'windows_thermal'
  | 'exteriors_common_areas'
  | 'remodeling_quality'
  | 'maintenance'

export type ConditionCriterionInput = {
  code: ConditionCriterionCode
  score: ConditionLevel | null
  note?: string | null
  evidence: ConditionEvidence[]
  criticalIssue?: boolean
}

export type PropertyConditionAssessment = {
  version: typeof VALUATION_CONDITION_VERSION
  inspectedAt: string
  inspectedBy?: string | null
  criteria: ConditionCriterionInput[]
  generalNote?: string | null
  transformation?: TransformationEvidence
}

export type ConditionCriterionDefinition = {
  code: ConditionCriterionCode
  label: string
  weight: number
  critical: boolean
  description: string
}

export const CONDITION_CRITERIA: readonly ConditionCriterionDefinition[] = [
  { code: 'structure_envelope', label: 'Estructura y envolvente', weight: 20, critical: true, description: 'Estructura visible, techumbre, fachadas, losas, muros y cierres.' },
  { code: 'moisture_insulation', label: 'Humedad y aislación', weight: 15, critical: true, description: 'Filtraciones, humedad, condensación, impermeabilización y aislación.' },
  { code: 'installations', label: 'Instalaciones', weight: 20, critical: true, description: 'Sistemas eléctricos, sanitarios, gas, calefacción y seguridad.' },
  { code: 'kitchen_bathrooms', label: 'Cocina y baños', weight: 15, critical: false, description: 'Funcionamiento, desgaste, equipamiento y vigencia.' },
  { code: 'finishes_carpentry', label: 'Terminaciones y carpinterías', weight: 10, critical: false, description: 'Pisos, muros, cielos, puertas, muebles y terminaciones.' },
  { code: 'windows_thermal', label: 'Ventanas y desempeño térmico', weight: 5, critical: false, description: 'Ventanas, sellos, vidrios y comportamiento térmico.' },
  { code: 'exteriors_common_areas', label: 'Exteriores o áreas comunes', weight: 5, critical: false, description: 'Terrazas, jardines, fachadas, circulaciones o espacios comunes aplicables.' },
  { code: 'remodeling_quality', label: 'Calidad de remodelaciones', weight: 5, critical: false, description: 'Calidad, coherencia, antigüedad y documentación de intervenciones.' },
  { code: 'maintenance', label: 'Mantención general', weight: 5, critical: false, description: 'Orden, cuidado preventivo, reparaciones pendientes y mantenimiento observable.' },
] as const

export type PropertyConditionResult = {
  version: typeof VALUATION_CONDITION_VERSION
  status: ConditionStatus
  score: number | null
  coveragePct: number
  evidenceCoveragePct: number
  blockers: string[]
  warnings: string[]
  criteria: Array<ConditionCriterionInput & { weight: number; weightedScore: number | null }>
  transformation: {
    status: TransformationStatus
    verified: boolean
    sourceCount: number
    effectiveDate: string | null
    builtAreaOverrideM2: number | null
    constructionYearOverride: number | null
  }
  economicAdjustment: {
    status: 'not_calculated'
    reason: 'condition_classification_is_separate_from_economic_adjustment'
  }
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits))

function classify(score: number): Exclude<ConditionStatus, 'not_evaluable'> {
  if (score < 1.8) return 'critical'
  if (score < 2.6) return 'deficient'
  if (score < 3.4) return 'regular'
  if (score < 4.2) return 'good'
  return 'excellent'
}

function transformationResult(assessment: PropertyConditionAssessment): PropertyConditionResult['transformation'] {
  const transformation = assessment.transformation
  return {
    status: transformation?.status ?? 'unknown',
    verified: transformation?.status === 'verified' && (transformation.sources?.length ?? 0) > 0,
    sourceCount: transformation?.sources?.length ?? 0,
    effectiveDate: transformation?.effectiveDate ?? null,
    builtAreaOverrideM2: transformation?.builtAreaOverrideM2 ?? null,
    constructionYearOverride: transformation?.constructionYearOverride ?? null,
  }
}

export function evaluatePropertyCondition(assessment: PropertyConditionAssessment): PropertyConditionResult {
  const inputByCode = new Map(assessment.criteria.map((criterion) => [criterion.code, criterion]))
  const blockers: string[] = []
  const warnings: string[] = []
  let evaluatedWeight = 0
  let evidencedWeight = 0
  let weightedTotal = 0
  let hasCriticalIssue = false

  const criteria = CONDITION_CRITERIA.map((definition) => {
    const input = inputByCode.get(definition.code) ?? {
      code: definition.code,
      score: null,
      evidence: [],
      note: null,
      criticalIssue: false,
    }
    const score = input.score
    const hasEvidence = input.evidence.length > 0

    if (score !== null) {
      evaluatedWeight += definition.weight
      weightedTotal += score * definition.weight
      if (hasEvidence) evidencedWeight += definition.weight
      else warnings.push(`${definition.code}:score_without_evidence`)
    }

    if (definition.critical && score === null) blockers.push(`${definition.code}:critical_criterion_missing`)
    if (input.criticalIssue) {
      hasCriticalIssue = true
      blockers.push(`${definition.code}:critical_issue_reported`)
    }

    return {
      ...input,
      weight: definition.weight,
      weightedScore: score === null ? null : round(score * definition.weight),
    }
  })

  const coveragePct = round(evaluatedWeight)
  const evidenceCoveragePct = round(evidencedWeight)
  const transformation = transformationResult(assessment)

  if (assessment.transformation?.status === 'verified' && !transformation.sourceCount) warnings.push('verified_transformation_without_evidence')
  if (coveragePct < 80) blockers.push('coverage_below_80_pct')
  if (evidenceCoveragePct < 60) blockers.push('evidence_coverage_below_60_pct')

  if (blockers.some((blocker) => blocker.includes('critical_criterion_missing')) || coveragePct < 80) {
    return {
      version: VALUATION_CONDITION_VERSION,
      status: 'not_evaluable',
      score: null,
      coveragePct,
      evidenceCoveragePct,
      blockers,
      warnings,
      criteria,
      transformation,
      economicAdjustment: { status: 'not_calculated', reason: 'condition_classification_is_separate_from_economic_adjustment' },
    }
  }

  const score = round(weightedTotal / evaluatedWeight)
  let status = classify(score)
  if (hasCriticalIssue && (status === 'good' || status === 'excellent')) status = 'regular'

  return {
    version: VALUATION_CONDITION_VERSION,
    status,
    score,
    coveragePct,
    evidenceCoveragePct,
    blockers,
    warnings,
    criteria,
    transformation,
    economicAdjustment: { status: 'not_calculated', reason: 'condition_classification_is_separate_from_economic_adjustment' },
  }
}
