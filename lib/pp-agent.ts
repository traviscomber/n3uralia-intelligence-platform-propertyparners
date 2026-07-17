export const PP_NAME = 'PP'

export const PP_SCOPE = {
  market: 'Vitacura',
  product: ['casas', 'departamentos'],
  priority: 'ventas',
} as const

export type PpStep = {
  id: string
  title: string
  description: string
  output: string
}

export type PpAgentKey = 'capture' | 'dedupe' | 'report' | 'refresh' | 'monitor'

export type PpAgentWeight = {
  label: string
  value: number
  rationale: string
}

export type PpEscalationRule = {
  trigger: string
  response: string
}

export type PpAgent = {
  key: PpAgentKey
  title: string
  mission: string
  inputs: string[]
  signals: string[]
  outputs: string[]
  weights: PpAgentWeight[]
  guardrails: string[]
  fallbacks: string[]
  escalations: PpEscalationRule[]
  neighborhoodFocus: string[]
  decision: string
}

export type PpAudience = {
  key: 'seller' | 'director' | 'ceo'
  title: string
  description: string
  decision: string
}

export type PpAiLoopStep = {
  id: string
  title: string
  description: string
  input: string
  output: string
}

export type PpAiRule = {
  title: string
  detail: string
}

export const PP_STEPS: PpStep[] = [
  {
    id: 'capture',
    title: '1. Captura',
    description: 'Recibe datos desde scrapers, archivos XLS/CSV, fuentes historicas y benchmarks externos sin perder procedencia.',
    output: 'Inventario bruto con trazabilidad por fuente y fecha.',
  },
  {
    id: 'normalize',
    title: '2. Normalizacion y dedupe',
    description: 'Limpia nombres, barrios, precios, m2, links, fotos y aplica dedupe fuerte con evidencia multiple.',
    output: 'Base unica, comparable y lista para analisis y pricing.',
  },
  {
    id: 'report',
    title: '3. Reportes por rol',
    description: 'Genera salidas distintas para vendedor, director y CEO segun la profundidad, urgencia y decision requerida.',
    output: 'Reportes accionables por audiencia con siguiente paso claro.',
  },
  {
    id: 'refresh',
    title: '4. Actualizacion continua',
    description: 'Reingesta, vuelve a puntuar y refresca el mercado para evitar lecturas obsoletas o sesgadas.',
    output: 'Inteligencia viva, vigente y consistente.',
  },
]

export const PP_AGENTS: PpAgent[] = [
  {
    key: 'capture',
    title: 'Agente de captura',
    mission: 'Construye la base bruta mas amplia posible sin perder trazabilidad ni contexto comercial.',
    inputs: [
      'Scrapers de mercado',
      'Archivos XLS/CSV',
      'Fuentes historicas',
      'Benchmarks externos',
      'Metadatos de origen',
    ],
    signals: [
      'Nuevos avisos por fuente',
      'Actualizaciones de precio o estado',
      'Cobertura por barrio',
      'Completeness de fotos y links',
    ],
    outputs: [
      'Inventario bruto con lineage',
      'Registro de fuente por propiedad',
      'Cambios detectados por corrida',
    ],
    weights: [
      { label: 'Cobertura', value: 35, rationale: 'La prioridad es no perder inventario util para Vitacura.' },
      { label: 'Trazabilidad', value: 30, rationale: 'Cada registro debe poder explicarse por origen y fecha.' },
      { label: 'Frescura', value: 20, rationale: 'La captura mas reciente sostiene la lectura comercial.' },
      { label: 'Completitud', value: 15, rationale: 'Fotos, links y metadatos elevan utilidad operativa.' },
    ],
    guardrails: [
      'Nunca descarta registros por incompletos si aun aportan evidencia',
      'Siempre conserva el origen y la fecha de ingreso',
      'Prioriza cobertura antes que estetica de la data',
    ],
    fallbacks: [
      'Si falta una fuente, mantener el resto del inventario y marcar el hueco de cobertura.',
      'Si el scraper falla, reintentar con el ultimo set valido antes de bajar el volumen.',
    ],
    escalations: [
      { trigger: 'Cobertura cae por debajo del umbral semanal', response: 'Escalar a monitoreo y reprogramar ingestion prioritaria.' },
      { trigger: 'Aparecen lotes con baja completitud', response: 'Enviar a validacion y conservar el lote separado.' },
    ],
    neighborhoodFocus: ['Vitacura Centro', 'Lo Castillo', 'Lo Curro'],
    decision: 'Que ingreso merece entrar al pipeline y con que trazabilidad.',
  },
  {
    key: 'dedupe',
    title: 'Agente de normalizacion y dedupe',
    mission: 'Convierte registros fragmentados en una propiedad canonica unica y confiable.',
    inputs: [
      'Direccion y barrio',
      'Numero de publicacion',
      'URL de la fuente',
      'Geolocalizacion',
      'Precio, area y programa',
      'Tags, fotos y descripciones',
    ],
    signals: [
      'Coincidencia exacta de listing number o source id',
      'Similitud fuerte de direccion normalizada',
      'Distancia geografica corta con precio y metraje cercanos',
      'Calidad de completitud del registro',
    ],
    outputs: [
      'Registro canonico unico',
      'Merge de trazabilidad y fotos',
      'Senal de confianza del duplicado',
    ],
    weights: [
      { label: 'Precision', value: 40, rationale: 'Evita fusionar propiedades distintas por error.' },
      { label: 'Evidencia multiple', value: 30, rationale: 'Direccion, geo, precio y fuente deben reforzarse entre si.' },
      { label: 'Completitud canonica', value: 20, rationale: 'El registro final debe ser el mas util posible.' },
      { label: 'Conservacion de trazas', value: 10, rationale: 'La mejor fusion preserva todas las fuentes.' },
    ],
    guardrails: [
      'No fusiona si la evidencia es debil o contradictoria',
      'Conserva la mejor version de cada campo',
      'Marca ambiguedad antes que inventar una union falsa',
    ],
    fallbacks: [
      'Si la coincidencia es dudosa, dejar ambos registros separados.',
      'Si faltan coordenadas, subir el peso de direccion y fuente antes de fusionar.',
    ],
    escalations: [
      { trigger: 'Dos registros parecen iguales pero difieren en precio o tipo', response: 'Escalar a revision humana antes de consolidar.' },
      { trigger: 'El lote trae demasiados duplicados', response: 'Priorizar limpieza por barrio y fuente antes de seguir capturando.' },
    ],
    neighborhoodFocus: ['Vitacura Centro', 'Santa Maria de Manquehue', 'Las Tranqueras'],
    decision: 'Si dos registros representan la misma propiedad o deben quedar separados.',
  },
  {
    key: 'report',
    title: 'Agente de reportes',
    mission: 'Traduce la base canonica en narrativa comercial util para cada nivel de decision.',
    inputs: [
      'Inventario canonico',
      'Tendencias de mercado',
      'Salud de fuentes',
      'Historial de reportes',
      'Perfil del receptor',
    ],
    signals: [
      'Absorcion por barrio',
      'Precio relativo contra comparables',
      'Velocidad comercial',
      'Brechas del equipo o del negocio',
    ],
    outputs: [
      'Reporte de CEO',
      'Reporte de director',
      'Playbook de vendedor',
      'Alertas de captacion y foco',
    ],
    weights: [
      { label: 'Claridad por audiencia', value: 35, rationale: 'Cada nivel de decision necesita una capa diferente.' },
      { label: 'Accionabilidad', value: 30, rationale: 'Todo insight debe terminar en una decision o siguiente paso.' },
      { label: 'Vigencia comercial', value: 20, rationale: 'La narrativa debe reflejar la situacion actual de Vitacura.' },
      { label: 'Consistencia con data canonica', value: 15, rationale: 'No se admite narrar lo que no soporte la base.' },
    ],
    guardrails: [
      'Cada insight termina en una accion',
      'No inventa datos no soportados por la base',
      'Ajusta profundidad segun audiencia y contexto',
    ],
    fallbacks: [
      'Si no hay suficiente data, bajar la profundidad y subir el nivel ejecutivo.',
      'Si una audiencia no tiene suficientes señales, usar el ultimo corte valido como base.',
    ],
    escalations: [
      { trigger: 'La data no permite una recomendacion clara', response: 'Escalar a lectura de mercado y marcar gap de informacion.' },
      { trigger: 'Aparece ruido entre fuentes', response: 'Escalar a dedupe y monitoreo antes de publicar.' },
    ],
    neighborhoodFocus: ['Vitacura Centro', 'Nueva Costanera', 'Jardin del Este'],
    decision: 'Que version del mercado conviene mostrar y que accion comercial disparar.',
  },
  {
    key: 'refresh',
    title: 'Agente de refresco',
    mission: 'Mantiene la inteligencia actualizada y reevalua el mercado cuando cambia la evidencia.',
    inputs: [
      'Estado de ejecuciones',
      'Cambios en fuentes',
      'Inventario stale',
      'Nuevas cargas XLS/CSV',
      'Historial de cambios',
    ],
    signals: [
      'Fuentes sin actividad reciente',
      'Caidas en cobertura',
      'Saltos bruscos de precio o volumen',
      'Reaparicion de duplicados',
    ],
    outputs: [
      'Reingesta priorizada',
      'Re-score de inventario',
      'Actualizacion de ranking y freshness',
    ],
    weights: [
      { label: 'Frescura', value: 35, rationale: 'Una lectura vieja degrada la utilidad comercial.' },
      { label: 'Continuidad', value: 30, rationale: 'La base debe sostenerse sin interrupciones.' },
      { label: 'Relevancia', value: 20, rationale: 'Solo se reevalua lo que puede cambiar la decision.' },
      { label: 'Costo operativo', value: 15, rationale: 'La actualizacion debe ser eficiente y sostenida.' },
    ],
    guardrails: [
      'No sobreescribe sin evidencia nueva',
      'Escala cambios anormales para revision',
      'Protege el estado canonico antes de refrescar',
    ],
    fallbacks: [
      'Si una fuente esta inestable, congelar su ultima version valida y seguir con el resto.',
      'Si el refresh falla, conservar el ultimo ranking operativo.',
    ],
    escalations: [
      { trigger: 'Fuente sin actualizacion por varios ciclos', response: 'Escalar a monitoreo y marcar stale source.' },
      { trigger: 'El score cambia demasiado entre corridas', response: 'Escalar a validacion para revisar sesgo o duplicados.' },
    ],
    neighborhoodFocus: ['Lo Curro', 'Lo Castillo', 'Santa Maria de Manquehue'],
    decision: 'Que fuentes y registros deben refrescarse primero para no perder vigencia.',
  },
  {
    key: 'monitor',
    title: 'Agente de monitoreo',
    mission: 'Vigila la salud operativa del sistema para evitar degradacion silenciosa del producto.',
    inputs: [
      'Scrape runs',
      'Cobertura por fuente',
      'Errores y retries',
      'Entrega de reportes',
      'Alertas de calidad',
    ],
    signals: [
      'Baja de tasa de exito',
      'Latencia en ejecuciones',
      'Fuentes sin datos',
      'Fotos o links faltantes',
      'Anomalias de cobertura',
    ],
    outputs: [
      'Health snapshot',
      'Alertas de operacion',
      'Prioridad de escalamiento',
    ],
    weights: [
      { label: 'Salud del pipeline', value: 40, rationale: 'Sin estabilidad no hay inteligencia confiable.' },
      { label: 'Cobertura de fuentes', value: 25, rationale: 'El inventario se deteriora si una fuente cae.' },
      { label: 'Latencia operativa', value: 20, rationale: 'Los retrasos anticipan degradacion real.' },
      { label: 'Calidad de salida', value: 15, rationale: 'Reporte incompleto es un fallo de producto.' },
    ],
    guardrails: [
      'Escala antes de que el usuario note el problema',
      'Prioriza continuidad sobre elegancia tecnica',
      'Protege siempre el inventario y los reportes',
    ],
    fallbacks: [
      'Si la salud no puede calcularse, mostrar ultimo estado conocido y registrar aviso.',
      'Si faltan metricas de una fuente, mantener observacion del resto del pipeline.',
    ],
    escalations: [
      { trigger: 'Baja la tasa de exito o suben errores', response: 'Escalar a operacion y pausar la confianza en ese lote.' },
      { trigger: 'Se detectan gaps de cobertura o links vacios', response: 'Escalar a captura y validacion para corregir origen.' },
    ],
    neighborhoodFocus: ['Vitacura Centro', 'Estadio Manquehue', 'Las Hualtatas'],
    decision: 'Si el pipeline esta sano, degradado o requiere intervencion inmediata.',
  },
]

export const PP_AUDIENCES: PpAudience[] = [
  {
    key: 'seller',
    title: 'Ejecutivos de venta',
    description: 'Prioridades del dia, propiedades concretas, seguimientos, objeciones y argumentos de cierre.',
    decision: 'Que mover hoy, a quien llamar primero y con que relato.',
  },
  {
    key: 'director',
    title: 'Directores de venta',
    description: 'Desempeno del equipo, conversion, brechas, coaching, pipeline operativo y alertas de foco.',
    decision: 'Donde corregir, a que equipo empujar y que vendedor acompanar.',
  },
  {
    key: 'ceo',
    title: 'CEO',
    description: 'Lectura ejecutiva del negocio, riesgos, tendencia, comparacion de directores y foco por barrio.',
    decision: 'Que priorizar a nivel negocio y como asignar recursos.',
  },
]

export const PP_AI_LOOP: PpAiLoopStep[] = [
  {
    id: 'ingest',
    title: 'Ingesta',
    description: 'Captura nuevas propiedades, cambios de estado, benchmarks y reportes recientes.',
    input: 'Scrapers, market_data, ai_reports, scrape_runs',
    output: 'Pool bruto con evidencia y frescura.',
  },
  {
    id: 'normalize',
    title: 'Normalizacion',
    description: 'Unifica tipologias, barrios, precios, metadatos y elimina duplicados de baja confianza.',
    input: 'Direccion, barrio, listing_number, source_url, geo, precio',
    output: 'Inventario canonico y confiable.',
  },
  {
    id: 'score',
    title: 'Scoring',
    description: 'Puntua oportunidad, frescura, absorcion, riesgo y urgencia comercial.',
    input: 'Inventario canonico y señales de mercado',
    output: 'Ranking accionable por barrio, propiedad y audiencia.',
  },
  {
    id: 'decide',
    title: 'Decisioning',
    description: 'Convierte la lectura en una recomendacion clara para vendedor, director o CEO.',
    input: 'Ranking, contexto de audiencia y estado operativo',
    output: 'Siguiente accion priorizada y explicable.',
  },
  {
    id: 'deliver',
    title: 'Delivery',
    description: 'Publica el output adecuado en la interfaz y en los canales de reporte.',
    input: 'Insight final y reglas de audiencia',
    output: 'Reporte, alerta o playbook listo para usar.',
  },
  {
    id: 'learn',
    title: 'Learning loop',
    description: 'Mide si el output se uso, si mejoro la decision y si la fuente sigue confiable.',
    input: 'Feedback, cambios posteriores y salud del pipeline',
    output: 'Ajuste de pesos, reglas y escalamiento.',
  },
]

export const PP_AI_RULES: PpAiRule[] = [
  {
    title: 'Vitacura only',
    detail: 'Todo el razonamiento debe ignorar inventario y comparables fuera de Vitacura.',
  },
  {
    title: 'Sales only',
    detail: 'No se debe mezclar arriendo, desarrollo o categorias fuera de ventas de casas y departamentos.',
  },
  {
    title: 'Actionable first',
    detail: 'Cada insight debe terminar en una accion concreta y atribuible.',
  },
  {
    title: 'Dedupe before narrative',
    detail: 'Si el canon no esta limpio, el sistema debe frenar antes de narrar una conclusion fuerte.',
  },
  {
    title: 'Audience depth',
    detail: 'Vendedor, director y CEO reciben distintas capas de detalle y no el mismo resumen reciclado.',
  },
]

export const PP_AI_ESCALATIONS: PpAiRule[] = [
  {
    title: 'Stale source',
    detail: 'Si una fuente se enfria o deja de actualizar, marcarla como stale y bajar su peso en la sintesis.',
  },
  {
    title: 'Duplicate risk',
    detail: 'Si el merge es dudoso, dejar el registro separado y pedir validacion antes de consolidar.',
  },
  {
    title: 'Weak signal',
    detail: 'Si no hay suficiente evidencia, ampliar el nivel ejecutivo y reducir la precision aparente.',
  },
  {
    title: 'Market shock',
    detail: 'Si el precio, absorcion o volumen cambian brutalmente, escalar a revision humana y recalculo.',
  },
]
