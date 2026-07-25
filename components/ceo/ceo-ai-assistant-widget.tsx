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
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  async function askN3uralia() {
    setLoading(true)
    setAnswer('')

    const response = await fetch('/api/ceo/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })

    const data = await response.json()
    setAnswer(data.summary ?? data.answer ?? 'Respuesta preparada.')
    setLoading(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-96 rounded-2xl border bg-white p-5 shadow-2xl">
          <h3 className="text-lg font-semibold">N3uralia Executive AI</h3>
          <p className="text-sm text-gray-500">Asistente estratégico CEO</p>

          <div className="my-4 space-y-2">
            {questions.map((item) => (
              <button
                key={item}
                className="block w-full rounded-lg border p-3 text-left text-sm"
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
            onClick={askN3uralia}
            disabled={!question || loading}
            className="mt-3 w-full rounded-lg bg-black px-4 py-3 text-white"
          >
            {loading ? 'Analizando contexto empresarial...' : 'Analizar con N3uralia'}
          </button>

          {answer && (
            <div className="mt-4 rounded-lg border p-3 text-sm">
              <p>{answer}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setFeedback('up')}>👍</button>
                <button onClick={() => setFeedback('down')}>👎</button>
              </div>
              {feedback && <small>Feedback registrado: {feedback}</small>}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-xl"
      >
        AI
      </button>
    </div>
  )
}
