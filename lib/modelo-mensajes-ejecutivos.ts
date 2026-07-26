export type NivelMensaje =
  | 'informativo'
  | 'atencion'
  | 'importante'
  | 'critico'

export type MensajeEjecutivo = {
  titulo: string
  resumen: string
  evidencia: string[]
  confianza: number
  nivel: NivelMensaje
  recomendacion: string
}

export function crearMensajeEjecutivo(input: MensajeEjecutivo) {
  return {
    ...input,
    regla:
      'Comunicar con precisión, evidencia y lenguaje humano ejecutivo.',
  }
}
