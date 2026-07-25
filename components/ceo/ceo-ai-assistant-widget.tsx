'use client'

import { useState } from 'react'
import type { ResponseSections } from '@/lib/executive-response-guard'

type N3uraliaResponse = {
  summary: string
  sections: ResponseSections
  confidence: number
  sources: string[]
}

const QUICK_PROMPTS = [
  '¿Qué debo saber hoy?',
  '¿Qué bloquea más valor?',
  '¿Cuál es el mayor riesgo ahora?',
  '¿Qué acción tiene mayor impacto?',
]

const CONFIDENCE_COLOR: Record<'Alta' | 'Media' | 'Baja', string> = {
  Alta: 'text-emerald-400',
  Media: 'text-amber-400',
  Baja: 'text-red-400',
}

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<N3uraliaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(q?: string) {
    const finalQuestion = (q ?? question).trim()
    if (!finalQuestion) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/ceo/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQuestion, importance: 'high', requiresDecision: true }),
      })
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const data: N3uraliaResponse = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar N3uralia.')
    } finally {
      setLoading(false)
    }
  }

  function selectPrompt(p: string) {
    setQuestion(p)
    ask(p)
  }

  const conf = result?.sections?.nivelConfianza

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="mb-2 flex w-[420px] max-h-[82vh] flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-700/60 bg-orange-950/40 text-sm font-bold text-orange-400">
                N
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">N3uralia</p>
                <p className="text-[11px] text-neutral-400">Copiloto estrategico · CEO</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="text-neutral-500 transition-colors hover:text-neutral-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Quick prompts */}
          <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => selectPrompt(p)}
                className="shrink-0 rounded-full border border-neutral-700 px-3 py-1 text-[11px] text-neutral-300 transition-colors hover:border-orange-700/60 hover:text-orange-300"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex shrink-0 gap-2 border-t border-neutral-800 px-4 py-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  ask()
                }
              }}
              placeholder="Pregunta sobre la operacion, el mercado o las metas..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-orange-700/60 focus:outline-none"
            />
            <button
              onClick={() => ask()}
              disabled={loading || !question.trim()}
              aria-label="Enviar"
              className="self-end rounded-xl border border-orange-700/60 bg-orange-950/50 p-2.5 text-orange-300 transition-colors hover:bg-orange-900/40 disabled:opacity-40"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-3 rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Structured response */}
          {result && (
            <div className="overflow-y-auto px-5 pb-5 pt-1 space-y-4 text-sm">

              {/* Resumen ejecutivo */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Resumen ejecutivo</p>
                <p className="leading-relaxed text-neutral-200">{result.sections.resumenEjecutivo}</p>
              </div>

              {/* Senales principales */}
              {result.sections.senalesPrincipales.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Senales principales</p>
                  <ul className="space-y-2">
                    {result.sections.senalesPrincipales.map((s, i) => (
                      <li key={i} className="flex gap-2 text-neutral-300">
                        <span className="mt-0.5 shrink-0 text-orange-500">—</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidencia utilizada */}
              {result.sections.evidenciaUtilizada.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Evidencia utilizada</p>
                  <div className="space-y-2.5">
                    {result.sections.evidenciaUtilizada.map((d) => (
                      <div key={d.domain}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{d.domain}</p>
                        <ul className="space-y-0.5">
                          {d.items.map((item, i) => (
                            <li key={i} className="flex gap-2 text-xs text-neutral-400">
                              <span className="shrink-0 text-neutral-600">·</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Riesgos */}
              {result.sections.riesgos.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Riesgos</p>
                  <ul className="space-y-1.5">
                    {result.sections.riesgos.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs text-amber-300/80">
                        <span className="mt-0.5 shrink-0 text-amber-500">!</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Oportunidades */}
              {result.sections.oportunidades.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Oportunidades</p>
                  <ul className="space-y-1.5">
                    {result.sections.oportunidades.map((o, i) => (
                      <li key={i} className="flex gap-2 text-xs text-emerald-300/80">
                        <span className="mt-0.5 shrink-0 text-emerald-500">+</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nivel de confianza */}
              {conf && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Nivel de confianza</p>
                    <span className={`text-xs font-semibold ${CONFIDENCE_COLOR[conf.label]}`}>{conf.label}</span>
                  </div>
                  <p className="text-xs text-neutral-400">{conf.justificacion}</p>
                </div>
              )}

              {/* Fuentes */}
              {result.sources.length > 0 && (
                <p className="text-[10px] text-neutral-600">
                  Fuentes: {result.sources.slice(0, 3).join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar N3uralia' : 'Abrir N3uralia'}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-700/70 bg-neutral-950 text-orange-400 shadow-2xl transition-all hover:border-orange-500 hover:bg-neutral-900"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span className="text-lg font-bold tracking-tighter">N</span>
        )}
      </button>
    </div>
  )
}
