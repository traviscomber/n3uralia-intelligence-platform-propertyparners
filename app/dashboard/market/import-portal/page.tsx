'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'

type DatasetKind = 'portal_apartments' | 'portal_houses' | 'portal_projects'

type ImportResult = {
  mode: 'preview' | 'import'
  fileName: string
  observedAt: string
  summary: {
    rows: number
    valid: number
    skipped: number
    datasetKind: DatasetKind
    canonicalReference: boolean
    accepted?: number
    rejected?: number
    linked?: number
    unlinked?: number
    runId?: string | null
  }
  preview: Array<Record<string, unknown>>
  message?: string
  error?: string
}

const datasetLabels: Record<DatasetKind, string> = {
  portal_apartments: 'Departamentos',
  portal_houses: 'Casas',
  portal_projects: 'Proyectos',
}

export default function PortalCanonicalImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [datasetKind, setDatasetKind] = useState<DatasetKind>('portal_apartments')
  const [source, setSource] = useState('Portal Inmobiliario canónico · Property Partners')
  const [observedAt, setObservedAt] = useState('2026-03-09T20:31:02Z')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateDataset(next: DatasetKind) {
    setDatasetKind(next)
    setObservedAt(next === 'portal_houses' ? '2026-03-09T16:16:01Z' : next === 'portal_projects' ? '2026-03-09T23:34:01Z' : '2026-03-09T20:31:02Z')
  }

  async function run(mode: 'preview' | 'import') {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mode', mode)
      form.append('kind', 'portal_listings')
      form.append('source_system', 'portal_inmobiliario')
      form.append('source', source)
      form.append('dataset_kind', datasetKind)
      form.append('observed_at', observedAt)
      form.append('canonical_reference', 'true')
      form.append('full_snapshot', 'false')
      const response = await fetch('/api/market/import', { method: 'POST', body: form })
      const json = await response.json() as ImportResult
      if (!response.ok) throw new Error(json.error || 'No fue posible procesar el snapshot.')
      setResult(json)
    } catch (cause) {
      setResult(null)
      setError(cause instanceof Error ? cause.message : 'No fue posible procesar el snapshot.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="border-b border-[var(--n3-line)] pb-5">
        <Link href="/dashboard/market" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--n3-text-light)]">
          <ArrowLeft size={15} /> Volver a Mercado
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--n3-text-light)]">Portal Inmobiliario · snapshot canónico</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--n3-text-muted)]">Carga evidencia entregada por Property Partners. Se registra como observación histórica de referencia y nunca como inventario activo actual.</p>
      </header>

      <section className="grid gap-4 border-y border-[var(--n3-line)] py-5 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Archivo</span>
          <div className="flex items-center gap-3 border border-dashed border-[var(--n3-line)] p-4">
            <FileSpreadsheet size={18} />
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full text-sm" />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Dataset</span>
          <select value={datasetKind} onChange={(event) => updateDataset(event.target.value as DatasetKind)} className="w-full border border-[var(--n3-line)] bg-transparent px-3 py-3 text-sm">
            {Object.entries(datasetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Fuente</span>
          <input value={source} onChange={(event) => setSource(event.target.value)} className="w-full border border-[var(--n3-line)] bg-transparent px-3 py-3 text-sm" />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Fecha del snapshot</span>
          <input value={observedAt} onChange={(event) => setObservedAt(event.target.value)} className="w-full border border-[var(--n3-line)] bg-transparent px-3 py-3 text-sm" />
        </label>
      </section>

      <div className="flex gap-3">
        <button disabled={!file || loading} onClick={() => void run('preview')} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm disabled:opacity-50">
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />} Analizar
        </button>
        <button disabled={!file || loading} onClick={() => void run('import')} className="inline-flex items-center gap-2 bg-[var(--n3-accent)] px-4 py-2 text-sm text-black disabled:opacity-50">
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Importar referencia canónica
        </button>
      </div>

      {error ? <p className="text-sm text-[#ff8d87]">{error}</p> : null}
      {result ? (
        <section className="border-y border-[var(--n3-line)] py-5">
          <p className="text-sm font-medium text-[var(--n3-text-light)]">{result.message}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div><span className="text-xs text-[var(--n3-text-muted)]">Filas</span><strong className="block text-xl">{result.summary.rows}</strong></div>
            <div><span className="text-xs text-[var(--n3-text-muted)]">Válidas</span><strong className="block text-xl">{result.summary.valid}</strong></div>
            <div><span className="text-xs text-[var(--n3-text-muted)]">Omitidas</span><strong className="block text-xl">{result.summary.skipped}</strong></div>
            <div><span className="text-xs text-[var(--n3-text-muted)]">Aceptadas</span><strong className="block text-xl">{result.summary.accepted ?? '—'}</strong></div>
            <div><span className="text-xs text-[var(--n3-text-muted)]">Enlazadas</span><strong className="block text-xl">{result.summary.linked ?? '—'}</strong></div>
            <div><span className="text-xs text-[var(--n3-text-muted)]">Sin enlace</span><strong className="block text-xl">{result.summary.unlinked ?? '—'}</strong></div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
