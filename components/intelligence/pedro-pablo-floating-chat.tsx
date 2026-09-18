'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Bot, Database, RotateCcw, Send, ShieldCheck, Sparkles, X } from 'lucide-react'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: string
}

type AssistantResponse = {
  title: string
  answer: string
  confidence: 'high' | 'medium'
  evidence?: Evidence[]
  routing?: {
    route: 'fast-track' | 'full-agentic'
    domains: string[]
    reason: string
  }
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  title?: string
  confidence?: 'high' | 'medium'
  evidence?: Evidence[]
  routing?: AssistantResponse['routing']
}

const starters = [
  '¿Qué requiere mi atención hoy?',
  '¿Qué cambió y qué debería revisar primero?',
  '¿Cómo están las valorizaciones?',
  '¿Qué propiedades necesitan revisión?',
]

export function PedroPabloFloatingChat() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [open, messages, loading])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function ask(value: string) {
    const query = value.trim()
    if (!query || loading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    }

    setMessages((current) => [...current, userMessage])
    setPrompt('')
    setLoading(true)
    setError(null)

    try {
      const result = await fetch('/api/pedro-pablo/decision-support', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.error || 'No fue posible consultar Pedro Pablo.')

      const response = payload as AssistantResponse
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        title: response.title,
        confidence: response.confidence,
        evidence: response.evidence,
        routing: response.routing,
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar Pedro Pablo.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    void ask(prompt)
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void ask(prompt)
    }
  }

  function resetConversation() {
    if (loading) return
    setMessages([])
    setPrompt('')
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente IA Pedro Pablo"
        title="Asistente IA Pedro Pablo"
        className={`fixed bottom-5 right-4 z-[70] grid h-16 w-16 place-items-center rounded-full border border-[var(--primary)] bg-[var(--n3-black)] text-[var(--n3-text-light)] shadow-xl transition-all hover:-translate-y-0.5 hover:bg-[var(--n3-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] md:right-6 ${open ? 'pointer-events-none scale-95 opacity-0' : ''}`}
      >
        <Bot size={27} aria-hidden="true" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border border-[var(--n3-black)] bg-[var(--n3-teal-soft)]" aria-hidden="true" />
      </button>

      {open ? (
        <section
          aria-label="Asistente IA Pedro Pablo"
          className="fixed inset-x-3 bottom-3 z-[70] flex h-[min(720px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-xl border border-[var(--n3-line)] bg-[var(--n3-black)] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(460px,calc(100vw-2rem))]"
        >
          <header className="border-b border-[var(--n3-line)] bg-[var(--n3-deep)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--primary)] bg-[var(--n3-black)]">
                  <Bot size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">
                    <Sparkles size={12} aria-hidden="true" />
                    Asistente IA ejecutivo
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-[var(--n3-text-light)]">Pedro Pablo</div>
                  <div className="truncate text-[11px] text-[var(--n3-text-muted)]">Property Partners · inteligencia operacional</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={resetConversation}
                  disabled={loading || messages.length === 0}
                  aria-label="Nueva conversación"
                  title="Nueva conversación"
                  className="grid h-9 w-9 place-items-center rounded-md text-[var(--n3-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--n3-text-light)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                >
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar asistente"
                  className="grid h-9 w-9 place-items-center rounded-md text-[var(--n3-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--n3-line)] px-2 py-1"><Database size={11} aria-hidden="true" />Datos canónicos</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--n3-line)] px-2 py-1"><ShieldCheck size={11} aria-hidden="true" />Control humano</span>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--n3-black)] px-4 py-4">
            {messages.length === 0 && !loading ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--n3-text-light)]">
                    <Sparkles size={15} className="text-[var(--n3-teal-soft)]" aria-hidden="true" />
                    Pregunta al negocio como conversación
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
                    Puedo cruzar gestión, cartera, tareas, valorizaciones, reportes y mercado dentro de tu alcance. Si falta evidencia, lo indico y no completo el vacío con supuestos.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--n3-text-muted)]">Puedes partir por:</p>
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => setPrompt(starter)}
                      className="w-full rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2.5 text-left text-sm leading-5 text-[var(--n3-text-light)] transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] rounded-xl px-3.5 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-[var(--primary)] text-[var(--n3-text-light)]' : 'border border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--n3-text-light)]'}`}>
                      {message.role === 'assistant' && message.routing ? (
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
                          <span>{message.confidence === 'high' ? 'Confianza alta' : 'Confianza media'}</span>
                          <span aria-hidden="true">/</span>
                          <span>{message.routing.route === 'full-agentic' ? 'FullAgentic' : 'FastTrack'}</span>
                        </div>
                      ) : null}
                      {message.role === 'assistant' && message.title ? <div className="mb-1 font-semibold">{message.title}</div> : null}
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      {message.role === 'assistant' && message.evidence?.length ? (
                        <div className="mt-3 border-t border-[var(--n3-line)] pt-2">
                          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Evidencia</div>
                          {message.evidence.slice(0, 3).map((item, index) => (
                            <div key={`${message.id}-evidence-${index}`} className="text-[10px] leading-4 text-[var(--n3-text-muted)]">
                              <span className="text-[var(--n3-text-light)]">{item.label}</span> · {item.source}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
                {loading ? (
                  <div className="flex justify-start">
                    <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3.5 py-3 text-sm text-[var(--n3-text-muted)]">
                      Analizando evidencia autorizada…
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-3 py-2 text-xs text-[var(--destructive)]" role="alert">
                {error}
              </div>
            ) : null}
          </div>

          <footer className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] p-3">
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                id="pedro-pablo-floating-query"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onComposerKeyDown}
                rows={2}
                maxLength={800}
                placeholder="Pregunta a Pedro Pablo…"
                className="min-h-[54px] max-h-36 flex-1 resize-none rounded-lg border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2 text-sm text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                aria-label="Enviar consulta"
                className="grid h-[54px] w-[54px] place-items-center rounded-lg border border-[var(--primary)] text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
            <p className="mt-2 text-[10px] leading-4 text-[var(--n3-text-muted)]">Enter envía · Shift+Enter agrega línea. Las acciones sensibles siguen requiriendo confirmación humana.</p>
          </footer>
        </section>
      ) : null}
    </>
  )
}
