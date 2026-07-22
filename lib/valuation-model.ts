export type ValuationScenario = {
  margin: number
  publicationUf: number
  weightedUfM2: number
}

export type ApartmentValuationInput = {
  propertyType: 'Departamento'
  usefulAreaM2: number
  terraceAreaM2: number
  appliedUsefulUfM2: number
}

export type HouseValuationInput = {
  propertyType: 'Casa'
  builtAreaM2: number
  landAreaM2: number
  builtUfM2: number
  landUfM2: number
}

export type ValuationInput = ApartmentValuationInput | HouseValuationInput

export type DeterministicValuation = {
  propertyType: ValuationInput['propertyType']
  effectiveAreaM2: number
  commercialValueUf: number
  commercialWeightedUfM2: number
  componentValues: Array<{ label: string; valueUf: number }>
  scenarios: ValuationScenario[]
  method: string
}

const PUBLICATION_MARGINS = [0, 0.05, 0.1] as const

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function calculatePublicationScenarios(commercialValueUf: number, effectiveAreaM2: number): ValuationScenario[] {
  const value = finiteNonNegative(commercialValueUf)
  const area = finiteNonNegative(effectiveAreaM2)
  return PUBLICATION_MARGINS.map((margin) => {
    const publicationUf = value / (1 - margin)
    return {
      margin,
      publicationUf: Math.round(publicationUf),
      weightedUfM2: area > 0 ? round(publicationUf / area) : 0,
    }
  })
}

export function calculateDeterministicValuation(input: ValuationInput): DeterministicValuation {
  if (input.propertyType === 'Casa') {
    const builtArea = finiteNonNegative(input.builtAreaM2)
    const landArea = finiteNonNegative(input.landAreaM2)
    const builtValue = builtArea * finiteNonNegative(input.builtUfM2)
    const landValue = landArea * finiteNonNegative(input.landUfM2)
    const effectiveArea = builtArea + landArea / 4
    const commercialValue = builtValue + landValue
    return {
      propertyType: input.propertyType,
      effectiveAreaM2: round(effectiveArea),
      commercialValueUf: Math.round(commercialValue),
      commercialWeightedUfM2: effectiveArea > 0 ? round(commercialValue / effectiveArea) : 0,
      componentValues: [
        { label: 'Construcción', valueUf: Math.round(builtValue) },
        { label: 'Terreno', valueUf: Math.round(landValue) },
      ],
      scenarios: calculatePublicationScenarios(commercialValue, effectiveArea),
      method: 'Plantilla Casas: construcción x UF/m² + terreno x UF/m²; comparación ponderada con terreno al 25%.',
    }
  }

  const usefulArea = finiteNonNegative(input.usefulAreaM2)
  const terraceArea = finiteNonNegative(input.terraceAreaM2)
  const commercialValue = usefulArea * finiteNonNegative(input.appliedUsefulUfM2)
  const effectiveArea = usefulArea + terraceArea / 2
  return {
    propertyType: input.propertyType,
    effectiveAreaM2: round(effectiveArea),
    commercialValueUf: Math.round(commercialValue),
    commercialWeightedUfM2: effectiveArea > 0 ? round(commercialValue / effectiveArea) : 0,
    componentValues: [{ label: 'Superficie útil', valueUf: Math.round(commercialValue) }],
    scenarios: calculatePublicationScenarios(commercialValue, effectiveArea),
    method: 'Plantilla Departamentos: superficie útil x UF/m² aplicado; comparación ponderada con terraza al 50%.',
  }
}

export function apartmentOfferWeightedUfM2(priceUf: number, usefulAreaM2: number, totalAreaM2: number) {
  const effectiveArea = finiteNonNegative(usefulAreaM2) + Math.max(0, finiteNonNegative(totalAreaM2) - finiteNonNegative(usefulAreaM2)) / 2
  return effectiveArea > 0 ? priceUf / effectiveArea : 0
}

export function houseWeightedUfM2(priceUf: number, builtAreaM2: number, landAreaM2: number) {
  const effectiveArea = finiteNonNegative(builtAreaM2) + finiteNonNegative(landAreaM2) / 4
  return effectiveArea > 0 ? priceUf / effectiveArea : 0
}
