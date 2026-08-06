import Link from 'next/link'
import { Download, FileText, History, Plus } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { IntelligencePage } from '@/components/intelligence/design-system'

type CanonicalDocumentRow = {
  id: string
  title: string
  content: string
  tags: string[] | null
  created_at: string
}

type ReportView = {
  document: CanonicalDocumentRow
  parsed: Record<string, unknown> | null
  period: Record<string, unknown> | null
  delivery: Record<string, unknown> | null
  pdfHash: string | null
  status: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function parseContent(content: string) {
  try {
    return asRecord(JSON.parse(content))
  } catch {
    return null
  }
}

function readRecord(record: Record<string, unknown> | null, key: string) {
  return record ? asRecord(record[key]) : null
}

function readString(record: Record<string, unknown> | null, key: string, fallback = '—') {
  return record && typeof record[key] === 'string' && String(record[key]).trim()
    ? String(record[key])
    : fallback
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date)
}

function normalizeStatus(value: string) {
  const status = value.toLowerCase()
  if (status.includes('approved') || status.includes('aprobado')) return 'Aprobado'
  if (status.includes('review') || status.includes('revisión')) return 'Para revisión'
  if (status.includes('draft') || status.includes('borrador')) return 'Borrador'
  if (status.includes('sent') || status.includes('resent') || status.includes('enviado')) return 'Enviado'
  return 'Registrado'
}

function statusTone(status: string) {
  if (status === 'Aprobado' || status === 'Enviado') return 'text-[#8fdca8]'
  if (status === 'Para revisión') return 'text-[#f0c96a]'
  return 'text-white/55'
}

function toReportView(document: CanonicalDocumentRow): ReportView {
  const parsed = parseContent(document.content)
  const period = readRecord(parsed, 'period')
  const delivery = readRecord(parsed, 'delivery')
  const artifacts = readRecord(parsed, 'artifacts')
  const pdf = readRecord(artifacts, 'pdf')
  const rawStatus = readString(delivery, 'status', document.tags?.includes('draft') ? 'draft' : 'registered')

  return {
    document,
    parsed,
    period,
    delivery,
    pdfHash: readString(pdf, 'sha256', '') || null,
    status: normalizeStatus(rawStatus),
  }
}

export default async function CanonicalClientReportsPage() {
  await requirePageCapability('reports.global.read')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, title, content, tags, created_at')
    .contains('tags', ['n3uralia-client-report'])
    .order('created_at', { ascending: false })
    .limit(40)

  const reports = (error ? [] : (data || []) as CanonicalDocumentRow[]).map(toReportView)
  const visibleReports: ReportView[] = []
  const duplicateReports: ReportView[] = []
  const hashes = new Set<string>()

  for (const report of reports) {
    if (report.pdfHash && hashes.has(report.pdfHash)) {
      duplicateReports.push(report)
      continue
    }
    if (report.pdfHash) hashes.add(report.pdfHash)
    visibleReports.push(report)
  }

  const current = visibleReports[0] ?? null
  const history = [...visibleReports.slice(1), ...duplicateReports]

  return (
    <IntelligencePage>
      <header className="flex flex-col gap-5 border-b border-[var(--n3-line)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">Reportes</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--n3-text-light)]">Informes canónicos</h1>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Informe vigente, descarga e historial.</p>
        </div>
        <Link href="/dashboard/reportes/crear" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#d7332b] px-5 text-sm font-semibold text-white transition hover:bg-[#bd2e28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <Plus size={16} /> Crear reporte
        </Link>
      </header>

      {current ? (
        <section aria-labelledby="current-report-title">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Informe vigente</p>
            <span className={`text-xs font-semibold ${statusTone(current.status)}`}>{current.status}</span>
          </div>

          <article className="border-y border-[var(--n3-line)] py-7">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <h2 id="current-report-title" className="text-2xl font-semibold text-[var(--n3-text-light)]">{current.document.title}</h2>
                <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-xs text-[var(--n3-text-muted)]">
                  <span>{readString(current.period, 'start')} — {readString(current.period, 'end')}</span>
                  <span>Generado {formatDate(current.document.created_at)}</span>
                  <span>Corte {readString(current.period, 'source_cutoff')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a href={`/api/management/reports/canonical-client/${current.document.id}/artifact`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 text-sm text-white/80 transition hover:border-white/35 hover:text-white">
                  <FileText size={15} /> Abrir informe
                </a>
                <a href={`/api/management/reports/canonical-client/${current.document.id}/artifact?download=1`} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#d7332b] px-4 text-sm font-semibold text-white transition hover:bg-[#bd2e28]">
                  <Download size={15} /> Descargar PDF
                </a>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="border-y border-[var(--n3-line)] py-12 text-center">
          <FileText size={26} className="mx-auto text-white/25" />
          <h2 className="mt-4 text-lg font-semibold text-[var(--n3-text-light)]">Sin informes</h2>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Genere el primer informe canónico.</p>
        </section>
      )}

      {history.length > 0 ? (
        <section aria-labelledby="history-title">
          <div className="mb-3 flex items-center gap-2">
            <History size={15} className="text-white/40" />
            <h2 id="history-title" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Historial de versiones</h2>
          </div>
          <div className="border-t border-[var(--n3-line)]">
            {history.map((report) => (
              <article key={report.document.id} className="grid gap-3 border-b border-[var(--n3-line)] py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                <div>
                  <p className="text-sm font-medium text-[var(--n3-text-light)]">{report.document.title}</p>
                  <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{formatDate(report.document.created_at)} · {readString(report.period, 'start')} — {readString(report.period, 'end')}</p>
                </div>
                <span className={`text-xs font-semibold ${statusTone(report.status)}`}>{report.status}</span>
                <a href={`/api/management/reports/canonical-client/${report.document.id}/artifact`} target="_blank" rel="noreferrer" className="text-xs font-medium text-white/55 transition hover:text-white">Abrir</a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </IntelligencePage>
  )
}
