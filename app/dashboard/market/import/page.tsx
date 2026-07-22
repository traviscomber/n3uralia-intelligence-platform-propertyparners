'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2, FileSpreadsheet, Upload, Download, RefreshCw } from 'lucide-react'

type ImportPreviewRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
  source: string
  source_url: string | null
  recorded_at: string | null
  snapshot_date: string
}

type BenchmarkImportPreviewRow = {
  source: string
  source_url: string
  neighborhood: string
  listing_title: string | null
  offer_count: number
  low_price_clp: number | null
  high_price_clp: number | null
  price_currency: string | null
  recorded_at: string
}

type ImportResponse = {
  mode: 'preview' | 'import'
  kind: 'market_data' | 'benchmark_data'
  source: string
  snapshotDate: string
  summary: {
    rows: number
    neighborhoods: number
    sources: number
    skipped: number
    imported?: number
    snapshotRows?: number
  }
  preview: Array<ImportPreviewRow | BenchmarkImportPreviewRow>
  message?: string
  error?: string
}

function formatValue(value: number | null, suffix = '') {
  if (value == null) return 'N/A'
  return `${new Intl.NumberFormat('es-CL').format(value)}${suffix}`
}

export default function MarketImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState('claude_code_pipeline')
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10))
  const [mode, setMode] = useState<'preview' | 'import'>('preview')
  const [kind, setKind] = useState<'market_data' | 'benchmark_data'>('market_data')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResponse | null>(null)

  const templateHref = `/api/market/import/template?kind=${encodeURIComponent(kind)}`

  const stats = useMemo(() => {
    if (!result) return null
    return [
      { label: 'Filas', value: result.summary.rows },
      { label: 'Barrios', value: result.summary.neighborhoods },
      { label: 'Fuentes', value: result.summary.sources },
      { label: 'Omitidas', value: result.summary.skipped },
    ]
  }, [result])

  async function runImport(nextMode: 'preview' | 'import') {
    setLoading(true)
    setError(null)
    setMode(nextMode)
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('mode', nextMode)
      formData.append('kind', kind)
      formData.append('source', source)
      formData.append('snapshot_date', snapshotDate)

      const response = await fetch('/api/market/import', {
        method: 'POST',
        body: formData,
      })

      const json = (await response.json()) as ImportResponse
      if (!response.ok) {
        throw new Error(json.error || 'No pudimos procesar el archivo.')
      }

      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos procesar el archivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/market" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--n3-text-light)' }}>
              <ArrowLeft className="w-4 h-4" />
              Volver a Inteligencia de Mercado
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-[var(--n3-text-light)]">Importar datos de mercado</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--n3-text-muted)' }}>
            Sube archivos `.csv`, `.xls` o `.xlsx` con barrios de Vitacura. El endpoint queda listo para pipeline automatizado y carga manual.
          </p>
        </div>
        <a
          href={templateHref}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--n3-teal)' }}
        >
          <Download className="w-4 h-4" />
          Descargar plantilla
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Carga guiada</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--n3-text-light)]">Archivo de Inteligencia de Mercado</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--n3-text-muted)' }}>
                Reconoce nombres de columnas frecuentes como `barrio`, `precio_uf`, `precio_m2_uf`, `absorcion`, `inventario` y `dias_en_mercado`.
              </p>
            </div>
            <div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'var(--n3-black)', color: 'var(--n3-teal)' }}>
              Solo Vitacura
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Archivo</span>
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4" style={{ borderColor: 'var(--n3-line)', background: 'var(--n3-black)' }}>
                <FileSpreadsheet className="h-5 w-5" style={{ color: 'var(--n3-teal)' }} />
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="block w-full text-sm"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Fuente</span>
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="w-full rounded-lg border px-3 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--n3-line)' }}
                placeholder="claude_code_pipeline"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Fecha de corte</span>
              <input
                type="date"
                value={snapshotDate}
                onChange={(event) => setSnapshotDate(event.target.value)}
                className="w-full rounded-lg border px-3 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--n3-line)' }}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Modo</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as 'preview' | 'import')}
                className="w-full rounded-lg border px-3 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--n3-line)' }}
              >
                <option value="preview">Vista previa</option>
                <option value="import">Importar</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Tipo de importacion</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as 'market_data' | 'benchmark_data')}
                className="w-full rounded-lg border px-3 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--n3-line)' }}
              >
                <option value="market_data">Inteligencia de mercado por barrio</option>
                <option value="benchmark_data">Benchmarks externos</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runImport('preview')}
              disabled={loading || !file}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--n3-teal)' }}
            >
              {loading && mode === 'preview' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Analizar archivo
            </button>
            <button
              type="button"
              onClick={() => void runImport('import')}
              disabled={loading || !file}
              className="inline-flex items-center gap-2 border border-[var(--n3-line)] bg-black/20 px-4 py-2 text-sm font-medium text-[var(--n3-text-light)] disabled:opacity-60"
            >
              {loading && mode === 'import' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Importar a datos de mercado
            </button>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-[var(--n3-line)] bg-[#160d0c] px-4 py-3 text-sm text-[var(--n3-teal-soft)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--n3-black)', border: '1px solid var(--n3-line)', color: 'var(--n3-text-light)' }}>
                {result.message || 'Proceso completado.'}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats?.map((stat) => (
                  <div key={stat.label} className="rounded-lg p-3" style={{ background: 'var(--n3-deep)', border: '1px solid var(--n3-line)' }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--n3-text-light)]">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg" style={{ border: '1px solid var(--n3-line)' }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ background: 'var(--n3-black)', borderColor: 'var(--n3-line)' }}>
                  <h3 className="text-sm font-semibold text-[var(--n3-text-light)]">
                    {kind === 'benchmark_data' ? 'Vista previa de benchmarks' : 'Vista previa normalizada'}
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--n3-text-muted)' }}>{result.preview.length} filas visibles</span>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[var(--n3-deep)]">
                      <tr className="text-xs uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>
                        {kind === 'benchmark_data' ? (
                          <>
                            <th className="px-4 py-3">Fuente</th>
                            <th className="px-4 py-3">Barrio</th>
                            <th className="px-4 py-3">Ofertas</th>
                            <th className="px-4 py-3">Min CLP</th>
                            <th className="px-4 py-3">Max CLP</th>
                            <th className="px-4 py-3">Moneda</th>
                            <th className="px-4 py-3">Titulo</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3">Barrio</th>
                            <th className="px-4 py-3">UF</th>
                            <th className="px-4 py-3">UF/m2</th>
                            <th className="px-4 py-3">Absorcion</th>
                            <th className="px-4 py-3">Inventario</th>
                            <th className="px-4 py-3">Dias</th>
                            <th className="px-4 py-3">Fuente</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview.map((row) => {
                        const keyField = 'snapshot_date' in row ? row.snapshot_date : row.recorded_at

                        if (kind === 'benchmark_data') {
                          const benchmarkRow = row as BenchmarkImportPreviewRow
                          return (
                            <tr key={`row-${kind}-${keyField}`} className="border-t" style={{ borderColor: '#eef2f2' }}>
                              <td className="px-4 py-3 font-medium text-[var(--n3-text-light)]">{benchmarkRow.source}</td>
                              <td className="px-4 py-3">{benchmarkRow.neighborhood}</td>
                              <td className="px-4 py-3">{benchmarkRow.offer_count}</td>
                              <td className="px-4 py-3">{formatValue(benchmarkRow.low_price_clp)}</td>
                              <td className="px-4 py-3">{formatValue(benchmarkRow.high_price_clp)}</td>
                              <td className="px-4 py-3">{benchmarkRow.price_currency || 'CLP'}</td>
                              <td className="px-4 py-3">{benchmarkRow.listing_title || 'Sin titulo'}</td>
                            </tr>
                          )
                        }

                        const marketRow = row as ImportPreviewRow
                        const absorptionText = marketRow.absorption_rate == null ? 'N/A' : `${(marketRow.absorption_rate * 100).toFixed(1)}%`
                        const daysText = marketRow.avg_days_on_market == null ? 'N/A' : marketRow.avg_days_on_market.toFixed(1)

                        return (
                          <tr key={`row-${kind}-${keyField}`} className="border-t" style={{ borderColor: '#eef2f2' }}>
                            <td className="px-4 py-3 font-medium text-[var(--n3-text-light)]">{marketRow.neighborhood}</td>
                            <td className="px-4 py-3">{formatValue(marketRow.avg_price_uf)}</td>
                            <td className="px-4 py-3">{formatValue(marketRow.avg_price_m2_uf)}</td>
                            <td className="px-4 py-3">{absorptionText}</td>
                            <td className="px-4 py-3">{marketRow.inventory_count}</td>
                            <td className="px-4 py-3">{daysText}</td>
                            <td className="px-4 py-3">{marketRow.source}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--n3-deep)] p-6 shadow-sm" style={{ border: '1px solid var(--n3-line)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Contrato API</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Listo para Claude Code</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--n3-text-muted)' }}>
              El pipeline puede enviar `multipart/form-data` con `file` o un POST JSON con `rows`/`records`. Cambia el tipo a `benchmarks`
              para cargar Realtor o Portal Inmobiliario.
            </p>
            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
              <div className="mb-2 font-semibold text-slate-300">POST /api/market/import</div>
              <pre className="overflow-auto whitespace-pre-wrap leading-5">{`{
  "mode": "import",
  "kind": "benchmark_data",
  "source": "claude_code_pipeline",
  "snapshot_date": "2026-07-15",
  "rows": [
    {
      "source": "portal_inmobiliario_benchmark",
      "source_url": "https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana",
      "neighborhood": "Vitacura",
      "listing_title": "Casas en venta en Vitacura",
      "offer_count": 120,
      "low_price_clp": 320000000,
      "high_price_clp": 1450000000,
      "price_currency": "CLP",
      "recorded_at": "2026-07-15T00:00:00.000Z"
    }
  ]
}`}</pre>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--n3-deep)] p-6 shadow-sm" style={{ border: '1px solid var(--n3-line)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-text-light)' }}>Formato esperado</p>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--n3-text-light)' }}>
              <li>• `neighborhood` o `barrio` es obligatorio.</li>
              <li>• `absorption_rate` acepta `0.85` o `85`.</li>
              <li>• `source` y `snapshot_date` son opcionales.</li>
              <li>• `kind=market_data` actualiza `market_data` y el histórico `neighborhood_market_data`.</li>
              <li>• `kind=benchmark_data` inserta en `external_market_benchmarks`.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
