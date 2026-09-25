export type ValuationUatReadinessInput = {
  status: string
  propertyType: string | null
  subjectPropertyId: string | null
  conditionStatus: string | null
  acceptedComparableCount: number
}

export type ValuationUatReadiness = {
  ready: boolean
  stage: 'not_ready' | 'review_ready' | 'approved' | 'issued'
  blockers: string[]
}

export function valuationUatReadiness(input: ValuationUatReadinessInput): ValuationUatReadiness {
  const blockers: string[] = []
  if (input.propertyType !== 'Casa') blockers.push('La UAT V1 requiere una casa.')
  if (!input.subjectPropertyId) blockers.push('Sin vínculo a propiedad operacional.')
  if (!input.conditionStatus) blockers.push('Sin evaluación de condición.')
  else if (input.conditionStatus === 'not_evaluable') blockers.push('Condición no evaluable.')
  if (input.acceptedComparableCount < 3) blockers.push('Menos de 3 comparables aceptados.')

  if (input.status === 'issued') {
    return { ready: blockers.length === 0, stage: 'issued', blockers }
  }
  if (input.status === 'approved') {
    return { ready: blockers.length === 0, stage: 'approved', blockers }
  }
  if (input.status !== 'review') blockers.push('El caso debe estar en revisión para entrar al ciclo UAT.')

  return {
    ready: blockers.length === 0,
    stage: blockers.length === 0 ? 'review_ready' : 'not_ready',
    blockers,
  }
}
