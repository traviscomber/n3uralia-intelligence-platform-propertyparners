'use client'

import Link from 'next/link'
import { FormEvent, KeyboardEvent, useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, Database, History, ListChecks, Scale, Send, ShieldCheck, Sparkles, Target } from 'lucide-react'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations'
}

type Coverage = {
  management: { available: boolean; entities: number; alerts: number }
  tasks: { available: boolean; total: number; active: number; overdue: number }
  valuations: { available: boolean; total: number; review: number; drafts: number; approved: number }
}

type AssistantResponse = {
  title: string
  answer: string
  scopeLabel: string
  periodLabel: string
  confidence: 'high' | 'medium'
  evidence: Evidence[]
  actions: Array<{ label: string; href: string }>
  coverage: Coverage
  decisionPolicy: string
  mode: string
  writesPerformed: number
  generatedAt: string
}

type HistoryItem = {
  query: string
  response: AssistantResponse
}

const starters = [
  '¿Qué requiere mi atención hoy?',
  '¿Qué debería hacer ahora?',
  '¿Qué tareas están pendientes o vencidas?',
  '¿Cómo están las valorizaciones?',
]

function CoverageItem({ label, value, detail, unavailable = false }: { label: string; value: string; detail: string; unavailable?: boolean }) {
  return (
    <div className="border-t border-[var(--n3-line)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-[var(--n3-text-muted)]">{label}</span>
        <span className={unavailable ? 'text-xs text-[var(--n3-text-muted)]' : 'text-sm font-semibold text-[var(--n3-text-light)]'}>{value}</span>
      </div>
      <div className="mt-1 text-[10px] leading-4 text-[var(--n3-text-muted)]">{detail}</div>
    </div>
  )
}

export function PedroPabloWorkspace() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState<AssistantResponse | null>(null)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const evidence = useMemo(() => response?.evidence.slice(0, 8) ?? [], [response])
  const proposedActions = useMemo(() => response?.actions.slice(0, 4) ?? [], [response])

  async function ask(value: string) {
    const query = value.trim()
    if (!query || loading) return

    setLoading(true)
    setError(null)
    try {
      const result = await fetch('/api/pedro-pablo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.error || 'No fue posible consultar Pedro Pablo.')
      const nextResponse = payload as AssistantResponse
      if (response && lastQuery) {
        setHistory((current) => [...current.slice(-3), { query: lastQuery, response }])
      }
      setResponse(nextResponse)
      setLastQuery(query)
      setPrompt('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar Pedro Pablo.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(prompt)
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void ask(prompt)
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="pedro-pablo-title">
      <header className="border-b border-[var(--n3-line)] pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">
              <Sparkles aria-hidden="true" size={14} strokeWidth={1.6} />
              Operating intelligence
            </div>
            <h1 id="pedro-pablo-title" className="font-[var(--font-rajdhani)] text-3xl font-semibold tracking-[-0.02em] text-[var(--n3-text-light)] md:text-4xl">
              Pedro Pablo
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">
              Prioriza gestión, tareas y valorizaciones dentro de tu ámbito autorizado. Cada respuesta conserva procedencia, corte, cobertura y una siguiente acción verificable.
            </p>
          </div>
          <div className="flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
            <ShieldCheck aria-hidden="true" size={14} />
            Lectura gobernada · sin escrituras
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <div className="min-w-0 border border-[var(--n3-line)] bg-[var(--n3-deep)]">
          <div className="border-b border-[var(--n3-line)] px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-light)]">Consulta operacional</div>
            <div className="mt-1 text-xs text-[var(--n3-text-muted)]">Pregunta por prioridades, tareas, valorizaciones, cumplimiento o una entidad visible para tu rol.</div>
          </div>

          <div className="min-h-[420px] p-5 md:p-6">
            {!response && !loading ? (
              <div className="flex min-h-[360px] flex-col justify-between gap-8">
                <div>
                  <div className="max-w-xl text-xl font-medium leading-8 text-[var(--n3-text-light)]">¿Qué necesitas entender antes de decidir?</div>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--n3-text-muted)]">
                    Pedro Pablo cruza únicamente información que tu rol puede consultar y separa hechos, reglas operativas y datos no disponibles.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => void ask(starter)}
                      className="min-h-24 border border-[var(--n3-line)] px-4 py-3 text-left text-sm leading-5 text-[var(--n3-text-light)] transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center text-sm text-[var(--n3-text-muted)]" role="status">
                Componiendo contexto autorizado…
              </div>
            ) : null}

            {response && !loading ? (
              <article aria-live="polite">
                {lastQuery ? (
                  <div className="mb-4 border-l-2 border-[var(--primary)] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">
                    Consulta: <span className="text-[var(--n3-text-light)]">{lastQuery}</span>
                  </div>
                ) : null}
                <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
                  <span>{response.scopeLabel}</span>
                  <span aria-hidden="true">/</span>
                  <span>{response.periodLabel}</span>
                  <span aria-hidden="true">/</span>
                  <span>{response.confidence === 'high' ? 'Confianza alta' : 'Confianza media'}</span>
                </div>
                <h2 className="text-xl font-semibold text-[var(--n3-text-light)]">{response.title}</h2>
                <div className="mt-4 whitespace-pre-line text-sm leading-7 text-[var(--n3-text-light)]">{response.answer}</div>

                {proposedActions.length ? (
                  <section className="mt-7 border-t border-[var(--n3-line)] pt-5" aria-labelledby="pedro-pablo-plan-title">
                    <div className="flex items-center gap-2">
                      <Target aria-hidden="true" size={15} className="text-[var(--n3-teal-soft)]" />
                      <h3 id="pedro-pablo-plan-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-light)]">Plan sugerido</h3>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">Estas acciones no se ejecutan automáticamente. Abren el módulo correspondiente para revisión humana dentro del mismo ámbito autorizado.</p>
                    <div className="mt-4 grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-2">
                      {proposedActions.map((action, index) => (
                        <div key={`${action.href}-${action.label}`} className="bg-[var(--n3-black)] p-4">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Paso {index + 1} · requiere revisión</div>
                          <div className="mt-2 text-sm font-medium text-[var(--n3-text-light)]">{action.label}</div>
                          <div className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Motivo: deriva de la lectura actual y de la política de priorización visible.</div>
                          <Link href={action.href} className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[var(--primary)] px-3 text-xs font-semibold text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">
                            Revisar antes de actuar
                            <ArrowRight aria-hidden="true" size={14} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </article>
            ) : null}

            {error ? (
              <div className="flex min-h-[360px] items-center gap-3 text-sm text-[var(--destructive)]" role="alert">
                <CircleAlert aria-hidden="true" size={18} />
                {error}
              </div>
            ) : null}
          </div>

          <form onSubmit={submit} className="border-t border-[var(--n3-line)] p-4">
            <label htmlFor="pedro-pablo-query" className="sr-only">Pregunta a Pedro Pablo</label>
            <div className="flex gap-2">
              <textarea
                id="pedro-pablo-query"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={2}
                maxLength={800}
                placeholder="Pregunta a Pedro Pablo…"
                className="min-h-12 flex-1 resize-none border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-3 text-sm text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                aria-label="Enviar consulta"
                className="flex w-12 items-center justify-center border border-[var(--primary)] text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              >
                <Send aria-hidden="true" size={16} />
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[var(--n3-text-muted)]">Enviar: botón o Ctrl/⌘ + Enter.</div>
          </form>
        </div>

        <aside className="space-y-4">
          {response ? (
            <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
                <ListChecks aria-hidden="true" size={14} />
                Cobertura operativa
              </div>
              <div className="mt-4 space-y-3">
                <CoverageItem label="Gestión" value={`${response.coverage.management.entities} entidades`} detail={`${response.coverage.management.alerts} alertas visibles`} />
                <CoverageItem
                  label="Tareas"
                  value={response.coverage.tasks.available ? `${response.coverage.tasks.active} activas` : 'No disponible'}
                  detail={response.coverage.tasks.available ? `${response.coverage.tasks.overdue} vencidas · ${response.coverage.tasks.total} visibles` : 'El rol no expone este módulo'}
                  unavailable={!response.coverage.tasks.available}
                />
                <CoverageItem
                  label="Valorizaciones"
                  value={response.coverage.valuations.available ? `${response.coverage.valuations.total} casos` : 'No disponible'}
                  detail={response.coverage.valuations.available ? `${response.coverage.valuations.review} revisión · ${response.coverage.valuations.drafts} borrador · ${response.coverage.valuations.approved} aprobadas/emitidas` : 'El rol no expone este módulo'}
                  unavailable={!response.coverage.valuations.available}
                />
              </div>
            </div>
          ) : null}

          {history.length ? (
            <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
                <History aria-hidden="true" size={14} />
                Sesión actual
              </div>
              <div className="mt-4 space-y-3">
                {history.slice().reverse().map((item, index) => (
                  <button
                    key={`${item.query}-${index}`}
                    type="button"
                    onClick={() => {
                      setResponse(item.response)
                      setLastQuery(item.query)
                    }}
                    className="block w-full border-t border-[var(--n3-line)] pt-3 text-left first:border-t-0 first:pt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                  >
                    <div className="text-xs leading-5 text-[var(--n3-text-light)]">{item.query}</div>
                    <div className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{item.response.title}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
              <Database aria-hidden="true" size={14} />
              Evidencia
            </div>
            {response ? (
              <div className="mt-4 space-y-4">
                {evidence.length ? evidence.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="border-t border-[var(--n3-line)] pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--n3-text-light)]">{item.label}</div>
                      {item.domain ? <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{item.domain}</span> : null}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{item.source}</div>
                    {item.reference ? <div className="mt-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">{item.reference}</div> : null}
                    {item.cutoff ? <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]">Corte {item.cutoff}</div> : null}
                  </div>
                )) : <div className="mt-4 text-sm text-[var(--n3-text-muted)]">Sin evidencia adicional disponible.</div>}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">La procedencia y el corte aparecerán junto a cada respuesta evaluable.</p>
            )}
          </div>

          <div className="border border-[var(--n3-line)] p-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
              <Scale aria-hidden="true" size={14} />
              Gobernanza
            </div>
            <div className="mt-3 grid gap-3 text-xs leading-5 text-[var(--n3-text-muted)]">
              <div><span className="text-[var(--n3-text-light)]">Ámbito:</span> heredado del usuario autenticado.</div>
              <div><span className="text-[var(--n3-text-light)]">Escrituras:</span> desactivadas; Pedro Pablo sólo analiza y propone revisión.</div>
              <div><span className="text-[var(--n3-text-light)]">Confirmación:</span> toda acción consecuencial seguirá requiriendo intervención humana.</div>
              <div><span className="text-[var(--n3-text-light)]">Vacíos:</span> no se completan ni estiman.</div>
              <div><span className="text-[var(--n3-text-light)]">Modo:</span> operating agent canónico y gobernado.</div>
              {response ? <div><span className="text-[var(--n3-text-light)]">Prioridad:</span> {response.decisionPolicy}</div> : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
