'use client'

import { useState } from 'react'

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  async function ask() {
    setLoading(true)
    const response = await fetch('/api/ceo/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    const data = await response.json()
    setAnswer(data.summary ?? 'Respuesta ejecutiva preparada.')
    setLoading(false)
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {open && (
        <div className="mb-5 w-96 rounded-3xl border border-orange-900/50 bg-black/95 p-6 text-white shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-orange-400">⌂</span>
            <div>
              <h3 className="tracking-[0.2em] text-sm text-orange-400">N3URALIA</h3>
              <p className="text-lg">Tu copiloto estratégico</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-400">
            Inteligencia ejecutiva para Property Partners.
          </p>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="¿Qué debo saber hoy?"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm"
          />

          <button
            onClick={ask}
            className="mt-3 w-full rounded-xl bg-orange-800 px-4 py-3 text-white"
          >
            {loading ? 'Analizando evidencia...' : 'Consultar N3uralia'}
          </button>

          {answer && (
            <div className="mt-4 rounded-xl border border-neutral-800 p-3 text-sm">
              {answer}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir N3uralia"
        className="flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-700 bg-black text-3xl text-orange-400 shadow-2xl"
      >
        ⌂
      </button>
    </div>
  )
}
