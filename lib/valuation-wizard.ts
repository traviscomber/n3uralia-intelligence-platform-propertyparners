import type { ValuationSubject } from './valuation-contract'

export type ValuationWizardStep = 1 | 2 | 3 | 4 | 5

export const VALUATION_WIZARD_STEPS: Array<{ step: ValuationWizardStep; label: string; shortLabel: string }> = [
  { step: 1, label: 'Identificar propiedad', shortLabel: 'Propiedad' },
  { step: 2, label: 'Completar estado actual', shortLabel: 'Estado actual' },
  { step: 3, label: 'Analizar mercado', shortLabel: 'Mercado' },
  { step: 4, label: 'Decisión de valorización', shortLabel: 'Decisión' },
  { step: 5, label: 'Revisar y guardar', shortLabel: 'Revisión' },
]

function positive(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value > 0
}

export function valuationWizardBlockingReason(args: {
  step: ValuationWizardStep
  subject: ValuationSubject
  selectedComparableCount: number
  hasResult: boolean
}) {
  const { step, subject, selectedComparableCount, hasResult } = args

  if (step === 1) {
    if (!subject.address.trim()) return 'Identifica la dirección antes de continuar.'
    if (!subject.neighborhood.trim()) return 'Confirma el barrio o sector antes de continuar.'
    return null
  }

  if (step === 2) {
    if (subject.propertyType === 'Departamento' && !positive(subject.usefulAreaM2)) {
      return 'Confirma los m² útiles que se usarán para la valorización.'
    }
    if (subject.propertyType === 'Casa' && (!positive(subject.builtAreaM2) || !positive(subject.landAreaM2))) {
      return 'Confirma m² construidos y m² de terreno antes de analizar el mercado.'
    }
    return null
  }

  if (step === 3) {
    if (selectedComparableCount < 3) return 'Selecciona al menos tres comparables válidos antes de continuar.'
    return null
  }

  if (step === 4) {
    if (!hasResult) return 'Confirma la tasa de valorización para obtener el valor comercial.'
    return null
  }

  return null
}
