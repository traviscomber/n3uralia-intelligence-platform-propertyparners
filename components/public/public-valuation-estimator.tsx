'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, BarChart3, Loader2, MapPin, ShieldCheck } from 'lucide-react'

type CoverageOption = {
  neighborhood: string
  sampleCount: number
}

type Estimate = {
  estimateUf: number
  lowUf: number
  highUf: number
  medianUfM2: number
  sampleCount: number
  marketSampleCount: number
  newestObservation: string | null
}

type EstimateResponse = {
  ok: boolean
  estimate?: Estimate
  error?: string
  disclaimer?: string
}

const uf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

export default function PublicValuationEstimator() {
  const [coverage, setCoverage] = useState<CoverageOption[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [builtAreaM2, setBuiltAreaM2] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [loadingCoverage, setLoadingCoverage] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Estimate | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/public/valuation-estimate', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as { ok: boolean; coverage?: CoverageOption[]; error?: string }
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible cargar la cobertura.')
        if (!active) return
        const options = payload.coverage ?? []
        setCoverage(options)
        setNeighborhood(options[0]?.neighborhood ?? '')
      })
      .catch((error: unknown) => {
        if (!active) return
        setMessage(error instanceof Error ? error.message : 'No fue posible cargar la cobertura.')
      })
      .finally(() => {
        if (active) setLoadingCoverage(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setResult(null)
    setMessage('')

    try {
      const response = await fetch('/api/public/valuation-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: 'Casa',
          neighborhood,
          builtAreaM2: Number(builtAreaM2),
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
        }),
      })
      const payload = (await response.json()) as EstimateResponse
      if (!response.ok || !payload.ok || !payload.estimate) {
        throw new Error(payload.error || 'No fue posible calcular la estimación.')
      }
      setResult(payload.estimate)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible calcular la estimación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 sm:p-7 lg:p-8">
      <div className="mb-7 flex items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--n3-teal-soft)]">Cotizador público</p>
          <h2 className="text-2xl font-semibold text-[var(--n3-text-light)] sm:text-3xl">Obtén un rango referencial</h2>
        </div>
        <BarChart3 className="mt-1 size-6 shrink-0 text-[var(--n3-teal-soft)]" aria-hidden="true" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="flex items-center gap-2 text-sm text-[var(--n3-text-muted)]">
              <MapPin className="size-4" aria-hidden="true" /> Sector en Vitacura
            </span>
            <select
              className="h-12 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 text-[var(--n3-text-light)] outline-none focus:border-[var(--n3-teal-soft)]"
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              disabled={loadingCoverage || coverage.length === 0}
              required
            >
              {loadingCoverage && <option value="">Cargando cobertura…</option>}
              {!loadingCoverage && coverage.length === 0 && <option value="">Cobertura no disponible</option>}
              {coverage.map((option) => (
                <option key={option.neighborhood} value={option.neighborhood}>
                  {option.neighborhood}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-[var(--n3-text-muted)]">Superficie construida</span>
            <div className="relative">
              <input
                className="h-12 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 pr-12 text-[var(--n3-text-light)] outline-none placeholder:text-[#67706f] focus:border-[var(--n3-teal-soft)]"
                type="number"
                min="30"
                max="1500"
                step="1"
                inputMode="decimal"
                placeholder="Ej. 280"
                value={builtAreaM2}
                onChange={(event) => setBuiltAreaM2(event.target.value)}
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--n3-text-muted)]">m²</span>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-sm text-[var(--n3-text-muted)]">Dormitorios</span>
              <input
                className="h-12 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 text-[var(--n3-text-light)] outline-none placeholder:text-[#67706f] focus:border-[var(--n3-teal-soft)]"
                type="number"
                min="1"
                max="12"
                step="1"
                placeholder="4"
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--n3-text-muted)]">Baños</span>
              <input
                className="h-12 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 text-[var(--n3-text-light)] outline-none placeholder:text-[#67706f] focus:border-[var(--n3-teal-soft)]"
                type="number"
                min="1"
                max="12"
                step="1"
                placeholder="3"
                value={bathrooms}
                onChange={(event) => setBathrooms(event.target.value)}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || loadingCoverage || coverage.length === 0}
          className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--n3-teal)] px-5 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
          {submitting ? 'Calculando…' : 'Calcular rango referencial'}
        </button>
      </form>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--n3-text-muted)]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--n3-teal-soft)]" aria-hidden="true" />
        No solicitamos ni almacenamos datos personales en este cotizador. La cobertura pública inicial corresponde a casas en Vitacura.
      </p>

      <div aria-live="polite">
        {message && (
          <div className="mt-6 border border-[var(--n3-line)] bg-[#080d0d] p-4 text-sm leading-6 text-[var(--n3-text-muted)]">
            {message}
          </div>
        )}

        {result && (
          <div className="mt-7 border-t border-[var(--n3-line)] pt-7">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--n3-teal-soft)]">Valor aproximado</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-4xl font-semibold tracking-tight text-[var(--n3-text-light)] sm:text-5xl">
                {uf.format(result.estimateUf)}
              </strong>
              <span className="text-xl text-[var(--n3-text-muted)]">UF</span>
            </div>
            <p className="mt-3 text-sm text-[var(--n3-text-muted)]">
              Rango de mercado: <span className="text-[var(--n3-text-light)]">{uf.format(result.lowUf)}–{uf.format(result.highUf)} UF</span>
            </p>

            <div className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
              <div className="bg-[var(--n3-deep)] p-4">
                <span className="block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Muestra usada</span>
                <strong className="mt-1 block text-lg text-[var(--n3-text-light)]">{result.sampleCount}</strong>
              </div>
              <div className="bg-[var(--n3-deep)] p-4">
                <span className="block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana oferta</span>
                <strong className="mt-1 block text-lg text-[var(--n3-text-light)]">{result.medianUfM2.toFixed(1)} UF/m²</strong>
              </div>
              <div className="bg-[var(--n3-deep)] p-4">
                <span className="block text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Base sector</span>
                <strong className="mt-1 block text-lg text-[var(--n3-text-light)]">{result.marketSampleCount}</strong>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-[var(--n3-text-muted)]">
              Estimación automática referencial basada en publicaciones activas de oferta territorialmente resueltas. No constituye una tasación ni reemplaza la valorización profesional de Property Partners.
            </p>

            <a
              className="mt-5 inline-flex items-center gap-2 border border-[var(--n3-teal)] px-4 py-3 text-sm font-medium text-[var(--n3-text-light)] hover:bg-[var(--n3-teal-dim)]"
              href="https://ppartnersgroup.com/contacto/"
              target="_blank"
              rel="noreferrer"
            >
              Solicitar valorización profesional <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
