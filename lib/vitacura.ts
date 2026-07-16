export const VITACURA_NEIGHBORHOODS = [
  'Vitacura Centro',
  'Lo Castillo',
  'Villa El Dorado',
  'Lo Curro',
  'Santa Maria de Manquehue',
  'Nueva Costanera',
  'Jardin del Este',
  'Las Hualtatas',
  'Las Tranqueras',
  'Luis Pasteur',
  'Juan XXIII',
  'Estadio Manquehue',
] as const

export type VitacuraNeighborhoodInsight = {
  neighborhood: string
  commercialFocus: string
  watchout: string
  bestFor: string
}

export const VITACURA_NEIGHBORHOOD_INTELLIGENCE: VitacuraNeighborhoodInsight[] = [
  {
    neighborhood: 'Vitacura Centro',
    commercialFocus: 'Inventario liquido, rotacion rapida y lectura comercial de corto plazo.',
    watchout: 'Puede mezclar stock heterogeneo si no se depura por tipo y estado.',
    bestFor: 'Reportes de director y seguimiento diario de oportunidades.',
  },
  {
    neighborhood: 'Lo Castillo',
    commercialFocus: 'Casas premium con relato de valor por terreno, ubicacion y privacidad.',
    watchout: 'La comparabilidad exige precio por m2 y calidad del estado real.',
    bestFor: 'CEO y pricing de inventario de alta gama.',
  },
  {
    neighborhood: 'Lo Curro',
    commercialFocus: 'Casas grandes con foco en superficie, programa y valor de lote.',
    watchout: 'Los outliers de precio pueden sesgar la lectura si no se separan por tipologia.',
    bestFor: 'Vendedores y directores que trabajan cierres consultivos.',
  },
  {
    neighborhood: 'Santa Maria de Manquehue',
    commercialFocus: 'Familias, stock aspiracional y comparables con alta sensibilidad a calidad y entorno.',
    watchout: 'La falta de fotos o metraje consistente baja mucho la confianza de la lectura.',
    bestFor: 'Alertas de captacion y reportes para equipo comercial.',
  },
  {
    neighborhood: 'Estadio Manquehue',
    commercialFocus: 'Zona de referencia para seguimiento comercial y casas con buena conectividad.',
    watchout: 'Se debe cuidar la mezcla con propiedades que no pertenezcan al mismo submercado.',
    bestFor: 'Lecturas operativas de directores de venta.',
  },
  {
    neighborhood: 'Nueva Costanera',
    commercialFocus: 'Corredor premium con sensibilidad fuerte a imagen, contexto y posicionamiento.',
    watchout: 'Puede parecer mas fuerte de lo que es si la data trae repetidos o publicaciones viejas.',
    bestFor: 'CEO y posicionamiento comercial.',
  },
  {
    neighborhood: 'Jardin del Este',
    commercialFocus: 'Barrio de casas con foco en calidad de vida, conectividad y valor por sector.',
    watchout: 'La rotacion puede variar mucho segun calle y accesos.',
    bestFor: 'Playbooks de vendedor y priorizacion de prospeccion.',
  },
  {
    neighborhood: 'Las Tranqueras',
    commercialFocus: 'Inventario familiar y lectura util para precios relativos dentro de Vitacura.',
    watchout: 'La duplicacion de avisos puede inflar volumen aparente.',
    bestFor: 'Normalizacion y dedupe fuerte.',
  },
  {
    neighborhood: 'Las Hualtatas',
    commercialFocus: 'Casas con sensibilidad a superficie, entorno y comparables cercanos.',
    watchout: 'Las fichas incompletas reducen la calidad de la recomendacion.',
    bestFor: 'Reportes de mercado y captacion.',
  },
  {
    neighborhood: 'Luis Pasteur',
    commercialFocus: 'Corredor de apoyo para lectura de stock y posicionamiento por vitrina comercial.',
    watchout: 'El ruido de publicaciones viejas afecta la narrativa de oportunidad.',
    bestFor: 'Monitoreo y control de frescura.',
  },
  {
    neighborhood: 'Juan XXIII',
    commercialFocus: 'Zona util para contraste de precio, calidad y velocidad de salida.',
    watchout: 'Hay que confirmar que cada ficha pertenezca realmente a Vitacura.',
    bestFor: 'Validacion de cobertura y reportes de director.',
  },
  {
    neighborhood: 'Villa El Dorado',
    commercialFocus: 'Sector de lectura de inventario y cobertura historica.',
    watchout: 'La muestra puede ser pequena, asi que conviene leer tendencia y no solo volumen.',
    bestFor: 'Benchmarks y contexto de mercado.',
  },
] 

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeNeighborhoodName(value: string | null | undefined) {
  return stripAccents((value || '').trim().toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim()
}

export function isVitacuraNeighborhood(value: string | null | undefined) {
  const normalized = normalizeNeighborhoodName(value)
  if (!normalized) return false

  return VITACURA_NEIGHBORHOODS.some((neighborhood) => normalizeNeighborhoodName(neighborhood) === normalized)
}

export function filterVitacuraRows<T extends { neighborhood?: string | null }>(rows: T[]) {
  const filtered = rows.filter((row) => isVitacuraNeighborhood(row.neighborhood))
  return filtered.length ? filtered : rows
}

export function summarizeVitacuraNeighborhoods(rows: Array<{ neighborhood?: string | null }>, limit = 4) {
  return [...new Set(rows.map((row) => row.neighborhood).filter((value): value is string => Boolean(value && value.trim())))]
    .filter(isVitacuraNeighborhood)
    .slice(0, limit)
}

export function buildVitacuraNeighborhoodIntelligence(rows: Array<{ neighborhood?: string | null }>, limit = 4) {
  const names = summarizeVitacuraNeighborhoods(rows, limit)
  if (!names.length) return VITACURA_NEIGHBORHOOD_INTELLIGENCE.slice(0, limit)

  return names.map((name) => {
    const match = VITACURA_NEIGHBORHOOD_INTELLIGENCE.find((item) => normalizeNeighborhoodName(item.neighborhood) === normalizeNeighborhoodName(name))
    return (
      match || {
        neighborhood: name,
        commercialFocus: 'Barrio validado dentro de Vitacura con lectura comercial vigente.',
        watchout: 'Conviene confirmar tipologia, cobertura y frescura antes de usarlo en pricing.',
        bestFor: 'Reportes de mercado y seguimiento de inventario.',
      }
    )
  })
}
