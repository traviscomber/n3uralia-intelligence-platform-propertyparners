import Link from 'next/link'
import { Download, ExternalLink, FileText, Plus } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

type CanonicalDocumentRow = {
  id: string
  title: string
  content: string
  tags: string[] | null
  created_at: string
}

type ReportRecord = {
  id: string
  title: string
  period: string
  status: string
  createdAt: string
  pdfUrl: string | null
  downloadUrl: string | null
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

function readString(record: Record<string, unknown> | null, key: string, fallback = '') {
  return record && typeof record[key] === 'string' && String(record[key]).trim()
    ? String(record[key])
    : fallback
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatPeriod(record: Record<string, unknown> | null) {
  const period = readRecord(record, 'period')
  const start = readString(period, 'start')
  const end = readString(period, 'end')
  if (start && end && start !== end) return `${start} — ${end}`
  return start || end || 'Sin período'
}

function getArtifactUrl(parsed: Record<string, unknown> | null, type: 'pdf' | 'download') {
  const artifacts = readRecord(parsed, 'artifacts')
  const pdf = readRecord(artifacts, 'pdf')
  const candidates = type === 'pdf'
    ? ['url', 'viewUrl', 'artifactUrl', 'path']
    : ['downloadUrl', 'url', 'artifactUrl', 'path']

  for (const key of candidates) {
    const value = readString(pdf, key)
    if (value.startsWith('/')) return value
    if (value.startsWith('https://')) return value
  }
  return null
}

function normalizeStatus(parsed: Record<string, unknown> | null, tags: string[] | null) {
  const delivery = readRecord(parsed, 'delivery')
  const raw = readString(delivery, 'status', tags?.includes('approved') ? 'approved' : 'draft')
  const labels: Record<string, string> = {
    draft: 'Borrador',
    review: 'En revisión',
    approved: 'Aprobado',
    sent: 'Enviado',
    resent: 'Reenviado',
    registered: 'Registrado',
  }
  return labels[raw.toLowerCase()] ?? raw
}

export default async function CanonicalClientReportsPage() {
  await requirePageCapability('reports.global.read')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, title, content, tags, created_at')
    .contains('tags', ['n3uralia-client-report'])
    .order('created_at', { ascending: false })
    .limit(48)

  const documents = error ? [] : (data || []) as CanonicalDocumentRow[]
  const reports: ReportRecord[] = documents.map((document) => {
    const parsed = parseContent(document.content)
    return {
      id: document.id,
      title: document.title,
      period: formatPeriod(parsed),
      status: normalizeStatus(parsed, document.tags),
      createdAt: document.created_at,
      pdfUrl: getArtifactUrl(parsed, 'pdf'),
      downloadUrl: getArtifactUrl(parsed, 'download'),
    }
  })

  const current = reports[0] ?? null
  const history = reports.slice(1)

  return (
    <main className="min-h-screen bg-[#050707] px-4 py-4 text-white sm:px-6 md:px-8 md:py-6">
      <div className="mx-auto max-w-[1080px]">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">Informes</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Informes canónicos</h1>
          </div>
          <Link
            href="/dashboard/reportes/crear"
            className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#d7332b] px-4 text-xs font-semibold transition hover:bg-[#bd2e28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Plus size={15} /> Crear informe
          </Link>
        </header>

        <section className="mt-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Vigente</h2>
            <span className="text-xs text-white/35">{current ? current.status : 'Sin informe'}</span>
          </div>

          {current ? (
            <article className="grid gap-5 border-b border-white/10 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-white/38">{current.period}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{current.title}</h2>
                <p className="mt-2 text-xs text-white/38">Generado {formatDate(current.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {current.pdfUrl ? (
                  <Link href={current.pdfUrl} target="_blank" className="inline-flex min-h-10 items-center gap-2 border border-white/15 px-4 text-xs font-medium text-white/75 transition hover:border-white/30 hover:text-white">
                    <ExternalLink size={14} /> Abrir
                  </Link>
                ) : null}
                {current.downloadUrl ? (
                  <Link href={current.downloadUrl} className="inline-flex min-h-10 items-center gap-2 border border-white/15 px-4 text-xs font-medium text-white/75 transition hover:border-white/30 hover:text-white">
                    <Download size={14} /> Descargar PDF
                  </Link>
                ) : null}
                {!current.pdfUrl && !current.downloadUrl ? (
                  <span className="inline-flex min-h-10 items-center gap-2 border border-white/10 px-4 text-xs text-white/35">
                    <FileText size={14} /> PDF no vinculado
                  </span>
                ) : null}
              </div>
            </article>
          ) : (
            <div className="border-b border-white/10 py-8">
              <p className="text-sm text-white/45">No hay informes registrados.</p>
            </div>
          )}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Historial</h2>
            <span className="text-xs tabular-nums text-white/35">{history.length}</span>
          </div>

          {history.length > 0 ? (
            <div className="divide-y divide-white/8">
              {history.map((report) => (
                <article key={report.id} className="grid gap-3 py-4 sm:grid-cols-[140px_minmax(0,1fr)_100px_auto] sm:items-center">
                  <span className="text-xs font-medium text-white/55">{report.period}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/85">{report.title}</p>
                    <p className="mt-1 text-[11px] text-white/32">{formatDate(report.createdAt)}</p>
                  </div>
                  <span className="text-xs text-white/45">{report.status}</span>
                  <div className="flex justify-end gap-2">
                    {report.pdfUrl ? (
                      <Link href={report.pdfUrl} target="_blank" aria-label={`Abrir ${report.title}`} className="inline-flex h-9 w-9 items-center justify-center border border-white/10 text-white/55 transition hover:border-white/25 hover:text-white">
                        <ExternalLink size={14} />
                      </Link>
                    ) : null}
                    {report.downloadUrl ? (
                      <Link href={report.downloadUrl} aria-label={`Descargar ${report.title}`} className="inline-flex h-9 w-9 items-center justify-center border border-white/10 text-white/55 transition hover:border-white/25 hover:text-white">
                        <Download size={14} />
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-6 text-sm text-white/40">Sin versiones anteriores.</div>
          )}
        </section>
      </div>
    </main>
  )
}
