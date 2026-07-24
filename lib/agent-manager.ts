export type AgentType =
  | 'directorio'
  | 'ceo'
  | 'director_unidad'
  | 'ejecutiva'
  | 'mercado'
  | 'riesgo'
  | 'documental'
  | 'datos'

export type AgentTask = {
  pregunta: string
  agenteRequerido: AgentType
  razon: string
}

export function seleccionarAgente(pregunta: string): AgentTask {
  const texto = pregunta.toLowerCase()

  if (texto.includes('mercado')) {
    return {
      pregunta,
      agenteRequerido: 'mercado',
      razon: 'Se requiere inteligencia de mercado.',
    }
  }

  if (texto.includes('riesgo')) {
    return {
      pregunta,
      agenteRequerido: 'riesgo',
      razon: 'Se requiere análisis preventivo.',
    }
  }

  if (texto.includes('sucursal') || texto.includes('unidad')) {
    return {
      pregunta,
      agenteRequerido: 'director_unidad',
      razon: 'Se requiere inteligencia de unidad.',
    }
  }

  if (texto.includes('directorio') || texto.includes('board')) {
    return {
      pregunta,
      agenteRequerido: 'directorio',
      razon: 'Se requiere preparación ejecutiva para directorio.',
    }
  }

  return {
    pregunta,
    agenteRequerido: 'ceo',
    razon: 'Se requiere razonamiento ejecutivo.',
  }
}
