import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleAlert, CircleHelp } from 'lucide-react'
import { decisionTraceStatusLabel, type DecisionTraceItem } from '@/lib/intelligence-decision-trace'

function severityClass(severity: DecisionTraceItem['severity']) {
  if (severity === 'critical') return 'text-[var(--destructive)]'
  if (severity === 'warning') return 'text-[var(--chart-4)]'
  return 'text-[var(--n3-teal)]'
}

function confidenceLabel(confidence: DecisionTraceItem['confidence']) {
  if (confidence === 'high') return 'Alta'
  if (confidence === 'medium') return 'Media'
  if (confidence === 'low') return 'Baja'
  return 'No determinada'
}

function StatusIcon({ status }: { status: DecisionTraceItem['evidenceStatus'] }) {
  if (status === 'missing' || status === 'non_evaluable') return <CircleHelp aria-hidden="true" size={14} />
  if (status === 'approved_live' || status === 'verified_live' || status === 'documentary_canonical') return <CheckCircle2 aria-hidden="true" size={14} />
  return <CircleAlert aria-hidden="true" size={14} />
}

export function DecisionTrace({ items, title = 'Trazabilidad de decisión' }: { items: DecisionTraceItem[]; title?: string }) {
  return (
    <section aria-label={title} className="mt-6 border-y border-[var(--n3-line)] py-5">
      <div className="flex flex-col gap-2 border-b border-[var(--n3-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{title}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">
            Evidencia, corte y gobernanza usados para sustentar la señal. Esta vista no expone prompts ni lógica propietaria interna.
          </p>
        </div>
        <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{items.length} trazas</span>
      </div>

      {items.length ? (
        <div className="divide-y divide-[var(--n3-line)]">
          {items.map((item) => (
            <article key={item.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,.8fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className={`flex items-center gap-2 text-xs font-semibold ${severityClass(item.severity)}`}>
                  <StatusIcon status={item.evidenceStatus} />
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--n3-text-light)]">{item.evidenceLabel}</p>
                {item.action ? <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Acción: {item.action}</p> : null}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><dt className="text-[var(--n3-text-muted)]">Estado</dt><dd className="mt-0.5 font-medium">{decisionTraceStatusLabel(item.evidenceStatus)}</dd></div>
                <div><dt className="text-[var(--n3-text-muted)]">Confianza</dt><dd className="mt-0.5 font-medium">{confidenceLabel(item.confidence)}</dd></div>
                <div><dt className="text-[var(--n3-text-muted)]">Fuente</dt><dd className="mt-0.5 font-medium">{item.source}</dd></div>
                <div><dt className="text-[var(--n3-text-muted)]">Corte</dt><dd className="mt-0.5 font-medium">{item.cutoff || 'No disponible'}</dd></div>
                {item.ruleVersion ? <div><dt className="text-[var(--n3-text-muted)]">Política</dt><dd className="mt-0.5 font-medium">{item.ruleVersion}</dd></div> : null}
                {item.evidenceCount != null ? <div><dt className="text-[var(--n3-text-muted)]">Evidencias</dt><dd className="mt-0.5 font-medium tabular-nums">{item.evidenceCount}</dd></div> : null}
              </dl>

              {item.href ? (
                <Link href={item.href} aria-label={`Revisar evidencia: ${item.title}`} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">
                  Revisar evidencia <ArrowRight aria-hidden="true" size={13} />
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="py-4 text-sm text-[var(--n3-text-muted)]">No existen trazas disponibles para esta decisión.</p>
      )}
    </section>
  )
}
