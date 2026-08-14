export type PedroPabloExpertiseTopic =
  | 'commercial_valuation'
  | 'fiscal_appraisal'
  | 'urban_planning'
  | 'property_tax'

export type PedroPabloExpertiseSource = {
  id: string
  authority: 'SII' | 'Municipalidad de Vitacura' | 'MINVU'
  title: string
  url: string
  verifiedAt: string
}

export type PedroPabloExpertiseCard = {
  topic: PedroPabloExpertiseTopic
  label: string
  guidance: readonly string[]
  limits: readonly string[]
  sources: readonly PedroPabloExpertiseSource[]
}

const VERIFIED_AT = '2026-08-08'

export const PEDRO_PABLO_VITACURA_EXPERTISE = {
  id: 'pedro-pablo-vitacura-real-estate-v1',
  market: 'Vitacura, Santiago, Chile',
  purpose: 'Aportar criterio inmobiliario profesional sin reemplazar evidencia canónica, normativa vigente ni revisión específica del predio.',
  precedence: [
    'canonical_application_data',
    'property_specific_evidence',
    'current_official_regulation',
    'market_evidence',
    'expert_interpretation',
  ] as const,
  rules: [
    'Nunca convertir conocimiento general del mercado en un valor específico de una propiedad sin comparables y atributos verificables.',
    'Nunca usar el avalúo fiscal como sustituto del valor comercial.',
    'Nunca afirmar constructibilidad, altura, uso de suelo, subdivisión o afectación sin identificar la zona/norma vigente del predio.',
    'Separar hechos oficiales, evidencia de mercado e interpretación profesional.',
    'Toda interpretación debe indicar qué dato faltante impide una conclusión más precisa.',
  ] as const,
} as const

export const PEDRO_PABLO_EXPERTISE_CARDS: readonly PedroPabloExpertiseCard[] = [
  {
    topic: 'commercial_valuation',
    label: 'Valor comercial y comparables',
    guidance: [
      'El valor comercial debe sustentarse en evidencia de mercado comparable y atributos verificables del inmueble.',
      'La comparabilidad debe considerar ubicación, tipología, superficie, estado, programa, fecha de evidencia y condiciones particulares del activo.',
      'Si faltan comparables recientes o atributos críticos, la conclusión debe declararse no evaluable o de menor confianza.',
    ],
    limits: [
      'No entregar un precio específico sin evidencia suficiente.',
      'No sustituir metodología contractual aprobada por heurísticas generales.',
    ],
    sources: [],
  },
  {
    topic: 'fiscal_appraisal',
    label: 'Avalúo fiscal',
    guidance: [
      'El avalúo fiscal es determinado por el SII para efectos del Impuesto Territorial y no equivale por sí solo al valor comercial.',
      'Los avalúos de bienes raíces se reajustan por IPC acumulado semestralmente en enero y julio.',
    ],
    limits: [
      'No inferir valor de mercado desde el avalúo fiscal.',
      'Para un predio específico, consultar los antecedentes vigentes del SII.',
    ],
    sources: [
      {
        id: 'sii-fiscal-appraisal-definition',
        authority: 'SII',
        title: 'Qué es una tasación fiscal',
        url: 'https://www.sii.cl/preguntas_frecuentes/aval_contrib_bbrr/001_165_0308.htm',
        verifiedAt: VERIFIED_AT,
      },
      {
        id: 'sii-fiscal-appraisal-adjustment',
        authority: 'SII',
        title: 'Cuándo y cómo se reajustan los avalúos',
        url: 'https://www.sii.cl/preguntas_frecuentes/aval_contrib_bbrr/001_165_8900.htm',
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    topic: 'urban_planning',
    label: 'Normativa urbana de Vitacura',
    guidance: [
      'El Plan Regulador Comunal define usos, forma y condiciones de construcción dentro de Vitacura.',
      'Las zonas del PRC pueden determinar usos de suelo, sistema de agrupamiento, constructibilidad, altura máxima, subdivisión mínima, antejardines y afectaciones viales.',
      'El PRC de Vitacura está subordinado al PRMS y al marco nacional LGUC/OGUC.',
    ],
    limits: [
      'No concluir normativa aplicable a un inmueble sin identificar su zona y antecedentes vigentes.',
      'Para una decisión predial, la fuente definitiva debe ser el instrumento vigente y los antecedentes oficiales aplicables al predio.',
    ],
    sources: [
      {
        id: 'vitacura-prc',
        authority: 'Municipalidad de Vitacura',
        title: 'Plan Regulador Comunal de Vitacura',
        url: 'https://vitacura.cl/municipalidad/planificacion-urbana/plan-regulador-comunal/que-es-el-plan-regulador-comunal/',
        verifiedAt: VERIFIED_AT,
      },
      {
        id: 'minvu-prc-zones',
        authority: 'MINVU',
        title: 'Qué significan las zonas de un Plan Regulador Comunal',
        url: 'https://www.minvu.gob.cl/preguntas-frecuentes/urbanismo-y-construccion/que-significan-las-zonas-de-un-plan-regulador-comunal/',
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
  {
    topic: 'property_tax',
    label: 'Contribuciones e Impuesto Territorial',
    guidance: [
      'El Impuesto Territorial se determina sobre el avalúo fiscal y bajo los parámetros legales vigentes.',
      'La condición tributaria de un inmueble debe verificarse con sus antecedentes vigentes; no puede inferirse únicamente desde precio, comuna o tipología.',
    ],
    limits: [
      'No entregar cálculo tributario específico sin antecedentes del inmueble y reglas vigentes.',
    ],
    sources: [
      {
        id: 'sii-property-tax',
        authority: 'SII',
        title: 'Impuesto Territorial',
        url: 'https://www.sii.cl/destacados/impuesto_territorial/index.html',
        verifiedAt: VERIFIED_AT,
      },
    ],
  },
]

export function expertiseCardsForPrompt(prompt: string) {
  const normalized = prompt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const topics = new Set<PedroPabloExpertiseTopic>()

  if (/(avaluo|fiscal|sii)/.test(normalized)) topics.add('fiscal_appraisal')
  if (/(contribucion|contribuciones|impuesto territorial)/.test(normalized)) topics.add('property_tax')
  if (/(plan regulador|prc|constructibilidad|altura|uso de suelo|subdivision|antejardin|normativa|urban)/.test(normalized)) topics.add('urban_planning')
  if (/(precio|valor comercial|tasacion|tasar|comparable|mercado|uf\/m2|uf m2)/.test(normalized)) topics.add('commercial_valuation')

  return PEDRO_PABLO_EXPERTISE_CARDS.filter((card) => topics.has(card.topic))
}
