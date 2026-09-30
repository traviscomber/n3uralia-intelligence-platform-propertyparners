import presentations from '@/data/presentations-2026.json'

const management = presentations.management

export const reportAudiences = [
  {
    id: 'ceo',
    label: 'PL Real Estate',
    purpose: 'Consolidado ejecutivo para Travis y directoras: compañía, oficinas, brechas y decisiones.',
    sourceScope: 'Bloques compañía y sucursales de las presentaciones auditadas',
    href: '/dashboard/reportes/audiencias/ceo',
    units: 1,
  },
  {
    id: 'director-cuenta',
    label: 'Oficina',
    purpose: 'Una oficina completa con la bajada de desempeño por Partner.',
    sourceScope: 'Bloque de sucursal y detalle por Partner de cada presentación Partners',
    href: '/dashboard/reportes/audiencias/director-cuenta',
    units: management.branches.length,
  },
  {
    id: 'ejecutivo',
    label: 'Partner',
    purpose: 'Reporte individual y privado del Partner.',
    sourceScope: 'Bloques individuales identificados como Partner en las presentaciones fuente',
    href: '/dashboard/reportes/audiencias/ejecutivo',
    units: management.partners.length,
  },
] as const

export const reportBranches = management.branches.map((item) => item.name)

export const reportPartners = management.partners.map((item) => ({
  name: item.name,
  branch: item.branch,
}))

export function getAudienceData(audience: string) {
  if (audience === 'ceo') return { kind: 'ceo' as const, company: management.company, branches: management.branches }
  if (audience === 'director-cuenta') return { kind: 'director-cuenta' as const, branches: management.branches, partners: management.partners }
  if (audience === 'ejecutivo') return { kind: 'ejecutivo' as const, partners: management.partners }
  return null
}
