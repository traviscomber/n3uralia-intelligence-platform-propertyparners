'use client'

export type AIStatus =
  | 'analizando_contexto'
  | 'consultando_fuentes'
  | 'evaluando_evidencia'
  | 'generando_respuesta'

export function AIThinkingIndicator({
  status,
}: {
  status: AIStatus
}) {
  const labels = {
    analizando_contexto: 'Analizando contexto empresarial...',
    consultando_fuentes: 'Consultando fuentes relevantes...',
    evaluando_evidencia: 'Evaluando evidencia y señales...',
    generando_respuesta: 'Preparando recomendación ejecutiva...',
  }

  return (
    <div>
      <span>{labels[status]}</span>
    </div>
  )
}
