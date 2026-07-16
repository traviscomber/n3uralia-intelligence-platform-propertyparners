export type ValuationComparable = {
  id: string
  address: string
  neighborhood: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  status: string
  source?: string | null
  similarity: number
  score: number
  price_per_m2: number
  delta_to_estimate_uf: number
  match_label: string
}

export type ValuationBenchmark = {
  source: string
  source_url: string
  neighborhood: string
  listing_title: string | null
  offer_count: number
  low_price_clp: number | null
  high_price_clp: number | null
  price_currency: string | null
  recorded_at: string
}

export type ValuationRequest = {
  neighborhood: {
    name: string
    price_per_sqm_uf: number
    velocity_days: number
    absorption_rate: number
    inventory_count: number
    zona_prc: string
  }
  area_m2: number
  bedrooms: number
  bathrooms: number
  age_years: number
  floor: number
  condition: 'excelente' | 'bueno' | 'regular' | 'a_renovar'
  has_parking: boolean
  has_storage: boolean
  has_pool: boolean
  estimated_uf: number
  estimated_uf_m2: number
  estimated_clp: number
  confidence: number
  comparable_source: string
  comparable_range_uf: string
  market_velocity: number
  market_absorption: number
  comparable_properties: number
  selected_comparables: ValuationComparable[]
  benchmark: ValuationBenchmark | null
}

export type ValuationSensitivity = {
  factor: string
  impact_uf: number
  direction: 'up' | 'down'
  note: string
}

export type ValuationBand = {
  label: 'conservador' | 'mercado' | 'aspiracional' | 'piso_negociacion'
  value_uf: number
  note: string
}

export type ValuationAnalysis = {
  title: string
  summary: string
  market_position: string
  why_now: string[]
  risks: string[]
  actions: string[]
  confidence_note: string
  band_recommendation: string
  price_bands: ValuationBand[]
  sensitivities: ValuationSensitivity[]
  source: 'openai' | 'deterministic'
}

export function stripAccents(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
}

function clampText(value: string) {
  return stripAccents(value).replace(/\s+/g, ' ').trim()
}

function positiveNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function buildPriceBands(estimatedUF: number, confidence: number, absorption: number): ValuationBand[] {
  const confidenceFactor = confidence >= 85 ? 0.02 : confidence >= 75 ? 0.03 : 0.04
  const absorptionFactor = absorption >= 80 ? 0.015 : absorption >= 65 ? 0.025 : 0.04
  const conservative = Math.round(estimatedUF * (1 - confidenceFactor - 0.01))
  const market = Math.round(estimatedUF * (1 + Math.max(0.01, absorptionFactor - 0.01)))
  const aspirational = Math.round(estimatedUF * (1 + absorptionFactor + 0.03))
  const floor = Math.round(estimatedUF * (1 - confidenceFactor / 2))

  return [
    {
      label: 'conservador',
      value_uf: conservative,
      note: 'Precio para vender mas rapido y reducir friccion comercial.',
    },
    {
      label: 'mercado',
      value_uf: market,
      note: 'Precio alineado con comparables y lectura actual de Vitacura.',
    },
    {
      label: 'aspiracional',
      value_uf: aspirational,
      note: 'Punto de salida con espacio de negociacion.',
    },
    {
      label: 'piso_negociacion',
      value_uf: floor,
      note: 'Umbral minimo recomendado para defensa comercial.',
    },
  ]
}

export function buildSensitivity(request: ValuationRequest): ValuationSensitivity[] {
  const base = positiveNumber(request.estimated_uf)
  const conditionImpact =
    request.condition === 'excelente'
      ? 0.06
      : request.condition === 'bueno'
        ? 0.02
        : request.condition === 'regular'
          ? -0.05
          : -0.1

  const floorImpact = request.floor <= 1 ? -0.03 : request.floor <= 3 ? -0.015 : request.floor >= 8 ? 0.02 : 0.01
  const parkingImpact = request.has_parking ? 0.03 : 0.03
  const storageImpact = request.has_storage ? 0.015 : 0.015
  const poolImpact = request.has_pool ? 0.02 : 0.02

  return [
    {
      factor: 'Estado',
      impact_uf: Math.round(Math.abs(base * conditionImpact)),
      direction: conditionImpact >= 0 ? 'up' : 'down',
      note: request.condition === 'excelente'
        ? 'La condicion agrega valor y mejora la salida comercial.'
        : request.condition === 'a_renovar'
          ? 'El estado actual exige descuento para competir.'
          : 'La condicion actual mantiene el precio cerca del promedio.',
    },
    {
      factor: 'Piso',
      impact_uf: Math.round(Math.abs(base * floorImpact)),
      direction: floorImpact >= 0 ? 'up' : 'down',
      note: request.floor <= 1
        ? 'Los pisos bajos suelen necesitar un ajuste a la baja.'
        : request.floor >= 8
          ? 'Los pisos altos tienden a capturar mejor valor.'
          : 'El piso no deberia mover mucho el precio.',
    },
    {
      factor: 'Estacionamiento',
      impact_uf: Math.round(base * parkingImpact),
      direction: request.has_parking ? 'up' : 'up',
      note: request.has_parking
        ? 'El estacionamiento ya suma valor de forma material.'
        : 'Agregar estacionamiento puede mejorar la propuesta de cierre.',
    },
    {
      factor: 'Bodega',
      impact_uf: Math.round(base * storageImpact),
      direction: request.has_storage ? 'up' : 'up',
      note: request.has_storage
        ? 'La bodega sostiene mejor el posicionamiento frente a competidores.'
        : 'Incluir bodega eleva la utilidad percibida del inmueble.',
    },
    {
      factor: 'Piscina',
      impact_uf: Math.round(base * poolImpact),
      direction: request.has_pool ? 'up' : 'up',
      note: request.has_pool
        ? 'La piscina ayuda a sostener un tramo superior de precio.'
        : 'No tener piscina no bloquea la venta, pero limita aspiracion.',
    },
  ]
}

export function buildFallbackValuationAnalysis(request: ValuationRequest): ValuationAnalysis {
  const bands = buildPriceBands(request.estimated_uf, request.confidence, request.market_absorption)
  const sensitivities = buildSensitivity(request)
  const topComparable = request.selected_comparables[0]
  const inventoryNote =
    request.neighborhood.inventory_count > 30
      ? 'Hay inventario elevado y conviene defender la velocidad.'
      : request.neighborhood.inventory_count > 15
        ? 'El inventario esta equilibrado y el precio debe estar bien afinado.'
        : 'El inventario es acotado y permite un poco mas de ambicion.'

  const absorptionNote =
    request.market_absorption > 80
      ? 'La absorcion alta valida una estrategia comercial mas firme.'
      : request.market_absorption > 65
        ? 'La absorcion es sana, pero no permite sobreactuar en precio.'
        : 'La absorcion baja pide un precio mas competitivo.'

  const whyNow = [
    `El barrio ${request.neighborhood.name} se mueve cerca de ${request.neighborhood.price_per_sqm_uf} UF/m2 y eso sigue siendo la referencia central.`,
    topComparable
      ? `El comparable mas cercano es ${topComparable.address} con score ${topComparable.score.toFixed(0)} y ayuda a anclar la lectura comercial.`
      : 'La base se apoya en el indice del barrio porque aun faltan comparables fuertes.',
    inventoryNote,
  ]

  const risks = [
    absorptionNote,
    request.comparable_properties < 3
      ? 'Todavia hay pocos comparables fuertes y la dispersion puede subir.'
      : 'Los comparables existen, pero deben revisarse antes de salir con un precio agresivo.',
    request.condition === 'a_renovar'
      ? 'El estado actual puede alargar la negociacion si el precio no entra al mercado.'
      : 'Un cambio en fotos, terminaciones o amenities puede mover el rango final.',
  ]

  const actions = [
    `Publicar con banda mercado en ${bands[1].value_uf.toLocaleString('es-CL')} UF y dejar margen de negociacion.`,
    'Usar el relato por barrio para defender valor frente a comparables mas debiles.',
    'Revisar la primera semana de respuesta y ajustar si no entra leads calificados.',
  ]

  const marketPosition =
    request.market_absorption >= 80
      ? 'Mercado firme con espacio para defender precio si la presentacion acompana.'
      : request.market_absorption >= 65
        ? 'Mercado estable, con necesidad de precision en el precio de salida.'
        : 'Mercado mas lento, donde la velocidad comercial importa mas que el anclaje alto.'

  const confidenceNote =
    request.confidence >= 85
      ? 'La lectura tiene respaldo fuerte por comparables, absorcion y cobertura.'
      : request.confidence >= 75
        ? 'La lectura es util, pero conviene seguir afinando comparables y frescura.'
        : 'La lectura sirve como guia comercial, no como precio cerrado.'

  return {
    title: `Lectura comercial ${request.neighborhood.name}`,
    summary: clampText(
      `El cotizador estima ${request.estimated_uf.toLocaleString('es-CL')} UF para ${request.neighborhood.name}, con una lectura ${marketPosition.toLowerCase()} y foco en ventas de casas y departamentos en Vitacura.`,
    ),
    market_position: marketPosition,
    why_now: whyNow,
    risks,
    actions,
    confidence_note: confidenceNote,
    band_recommendation: `Recomendamos salir cerca de ${bands[1].value_uf.toLocaleString('es-CL')} UF y reservar ${bands[3].value_uf.toLocaleString('es-CL')} UF como piso de negociacion.`,
    price_bands: bands,
    sensitivities,
    source: 'deterministic',
  }
}
