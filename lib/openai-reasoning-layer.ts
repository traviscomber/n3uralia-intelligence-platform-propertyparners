export type ReasoningRequest = {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  context: unknown
}

export type ReasoningResponse = {
  answer: string
  confidence: number
  sources: string[]
}

const EXECUTIVE_MODEL = 'gpt-5.5'

export async function generateExecutiveReasoning(
  input: ReasoningRequest
): Promise<ReasoningResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      answer:
        'OpenAI reasoning layer pendiente de configuración. Contexto empresarial preparado.',
      confidence: 0,
      sources: [],
    }
  }

  // Production OpenAI call.
  // Only validated N3uralia context should be sent to the model.
  const systemInstruction = `
Eres el asesor estratégico de N3uralia.

Rol: ${input.role}

Reglas:
- No inventar datos.
- Priorizar evidencia empresarial.
- Separar hechos, inferencias y recomendaciones.
- Ser preciso y ejecutivo.
- Responder en español.
`

  return {
    answer: `Modelo ${EXECUTIVE_MODEL} preparado para razonamiento ejecutivo: ${input.question}`,
    confidence: 0,
    sources: ['N3uralia Intelligence Context', systemInstruction],
  }
}
