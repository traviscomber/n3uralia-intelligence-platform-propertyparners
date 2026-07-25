'use client'

import { useState } from 'react'

const questions = [
  '¿Qué debo saber hoy?',
  '¿Qué no estoy viendo?',
  '¿Cuál es el principal riesgo?',
  '¿Dónde está la oportunidad?',
]

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-96 rounded-2xl border bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">N3uralia Executive AI</h3>
              <p className="text-sm text-gray-500">
                Asistente estratégico CEO
              </p>
            </div>
            <button onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="space-y-2 mb-4">
            {questions.map((item) => (
              <button
                key={item}
                className="block w-full rounded-lg border p-3 text-left text-sm hover:bg-gray-50"
                onClick={() => setQuestion(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Pregunta estratégica..."
            className="w-full rounded-lg border p-3 text-sm"
            rows={3}
          />

          <button
            className="mt-3 w-full rounded-lg bg-black px-4 py-3 text-white"
            disabled={!question}
          >
            Analizar con N3uralia
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-xl"
        aria-label="Abrir asistente N3uralia"
      >
        AI
      </button>
    </div>
  )
}
