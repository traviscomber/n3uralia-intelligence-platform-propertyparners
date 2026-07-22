import presentations from '@/data/presentations-2026.json'

const management = presentations.management

export const reportAudiences = [
  {
    id: 'directorio',
    label: 'Directorio',
    purpose: 'Gobierno, resultado consolidado, sucursales, scores, metas y conciliaciones.',
    sourceScope: 'Jun_Directorio_5.pptx y Q2_Directorio_1.pptx',
    href: '/dashboard/reportes/directorio',
    units: 1,
  },
  {
    id: 'ceo',
    label: 'CEO',
    purpose: 'Lectura ejecutiva consolidada con resultado compañía, brechas y desempeño por sucursal.',
    sourceScope: 'Bloques compañía y sucursales de las presentaciones de Directorio',
    href: '/dashboard/reportes/audiencias/ceo',
    units: 1,
  },
  {
    id: 'director-cuenta',
    label: 'Director de Cuenta',
    purpose: 'Seguimiento de una sucursal y de los Partners que pertenecen a ella.',
    sourceScope: 'Bloque de sucursal y detalle por Partner de cada presentación Partners',
    href: '/dashboard/reportes/audiencias/director-cuenta',
    units: management.branches.length,
  },
  {
    id: 'ejecutivo',
    label: 'Ejecutivo / Partner',
    purpose: 'Resultado, evolución, score e indicadores del Partner individual.',
    sourceScope: 'Bloques individuales identificados como Partner en las presentaciones fuente',
    href: '/dashboard/reportes/audiencias/ejecutivo',
    units: management.partners.length,
  },
] as const

export function getAudienceData(audience: string) {
  if (audience === 'ceo') return { kind: 'ceo' as const, company: management.company, branches: management.branches }
  if (audience === 'director-cuenta') return { kind: 'director-cuenta' as const, branches: management.branches, partners: management.partners }
  if (audience === 'ejecutivo') return { kind: 'ejecutivo' as const, partners: management.partners }
  return null
}

