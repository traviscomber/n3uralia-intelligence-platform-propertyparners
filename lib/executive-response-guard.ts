export type ExecutiveResponse = {
  summary: string
  facts: string[]
  inferences: string[]
  recommendations: string[]
  risks: string[]
  confidence: number
  sources: string[]
}

export function applyExecutiveResponseGuard(input: ExecutiveResponse) {
  return {
    ...input,
    principles: [
      'Mantener tono profesional y ejecutivo.',
      'No emitir juicios personales.',
      'Separar hechos de interpretaciones.',
      'No presentar hipótesis como certezas.',
      'Mostrar evidencia y nivel de confianza.',
      'Responder con respeto y precisión.',
    ],
  }
}
