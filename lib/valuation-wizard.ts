import type { ValuationSubject } from './valuation-contract'

export type ValuationWizardStep = 1 | 2 | 3 | 4 | 5

export const VALUATION_WIZARD_STEPS: Array<{ step: ValuationWizardStep; label: string; shortLabel: string }> = [
  { step: 1, label: 'Buscar propiedad', shortLabel: 'Propiedad' },
  { step: 2, label: 'Confirmar datos', shortLabel: 'Datos' },
  { step: 3, label: 'Elegir comparables', shortLabel: 'Comparables' },
  { step: 4, label: 'Definir valor', shortLabel: 'Valor' },
  { step: 5, label: 'Revisar y guardar', shortLabel: 'Revisar' },
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
