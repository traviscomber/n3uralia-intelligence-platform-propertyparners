'use client'

import { useState } from 'react'

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir asistente N3uralia"
      >
        N3uralia
      </button>

      {open && (
        <aside>
          <h3>Preguntar a N3uralia</h3>
          <p>
            Preguntas ejecutivas para CEO y Directorio.
          </p>
          <ul>
            <li>¿Qué debo saber hoy?</li>
            <li>¿Qué no estoy viendo?</li>
            <li>¿Cuál es el principal riesgo?</li>
            <li>¿Dónde está la oportunidad?</li>
          </ul>
        </aside>
      )}
    </>
  )
}
