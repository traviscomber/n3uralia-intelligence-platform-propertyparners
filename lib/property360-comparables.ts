export const MIN_PROPERTY360_COMPARABLES = 3

export function isVitacuraComparableAddress(value: unknown) {
  const address = String(value ?? '').toLocaleLowerCase('es-CL')
  return /(^|[\s,.-])vitacura([\s,.-]|$)/i.test(address)
}

export function hasDecisionGradeComparableSample(count: number) {
  return Number.isFinite(count) && count >= MIN_PROPERTY360_COMPARABLES
}
