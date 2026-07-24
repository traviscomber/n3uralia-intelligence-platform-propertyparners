export type DashboardFinding = {
  eyebrow: string
  title: string
  detail: string
  href: string
}

export type DashboardAction = {
  label: string
  detail: string
  href: string
}

export function formatMetric(value: number | null, digits = 0) {
  return value == null
    ? 'n/d'
    : value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

export function calculatePercentageDelta(current: number, previous: number | null) {
  if (!previous) return null

  return ((current - previous) / previous) * 100
}

export function buildDashboardFindings(input: {
  salesCount: number
  salesUf: number
  salesDelta: number | null
  stockCount: number
  stockReduction: number
  crmCoverage: number
  sourceCount: number
  crmIssues: number
}): DashboardFinding[] {
  return [
    {
      eyebrow: 'Actividad comercial',
      title: `${formatMetric(input.salesCount)} cierres registrados en junio`,
      detail: `${formatMetric(input.salesUf)} UF de volumen mensual${input.salesDelta == null ? '' : ` · ${input.salesDelta >= 0 ? '+' : ''}${formatMetric(input.salesDelta, 1)}% frente al mes anterior`}`,
      href: '/dashboard/control',
    },
    {
      eyebrow: 'Inventario',
      title: `${formatMetric(input.stockCount)} propiedades en stock`,
      detail: `${formatMetric(input.stockReduction)} unidades menos que en enero, según el universo CRM auditado.`,
      href: '/dashboard/properties',
    },
    {
      eyebrow: 'Calidad de información',
      title: `${formatMetric(input.crmCoverage, 1)}% de cobertura CRM`,
      detail: `${input.sourceCount} libros auditados y ${input.crmIssues} alertas conservadas para revisión.`,
      href: '/dashboard/datos-crm',
    },
  ]
}

export function buildDashboardActions(): DashboardAction[] {
  return [
    {
      label: 'Revisar mercado de Vitacura',
      detail: 'Tendencias, fuentes y señales del mercado.',
      href: '/dashboard/market',
    },
    {
      label: 'Valorizar una propiedad',
      detail: 'Comparables, rango recomendado y nivel de confianza.',
      href: '/dashboard/valorizador',
    },
    {
      label: 'Preparar reporte ejecutivo',
      detail: 'Síntesis programada para dirección y partners.',
      href: '/dashboard/reportes/autonomos',
    },
  ]
}
