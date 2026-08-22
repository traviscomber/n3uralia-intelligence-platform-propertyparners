'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import {
  assessValuationEvidence,
  calculateCanonicalComparableUfM2,
  calculateContractualValuation,
  type QualitativeFactors,
  type ValuationComparable,
  type ValuationSubject,
} from '@/lib/valuation-contract'
import { buildComparableWorkbench } from '@/lib/valuation-comparable-workbench'
import {
  VALUATION_WIZARD_STEPS,
  valuationWizardBlockingReason,
  type ValuationWizardStep,
} from '@/lib/valuation-wizard'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
} from '@/components/intelligence/design-system'
import { QuickSubjectLookup } from '@/components/valuation/quick-subject-lookup'

const emptySubject: ValuationSubject = {
  propertyType: 'Departamento',
  address: '',
  neighborhood: '',
  homogeneousArea: '',
  rol: '',
  latitude: undefined,
  longitude: undefined,
  usefulAreaM2: undefined,
  terraceAreaM2: undefined,
  builtAreaM2: undefined,
  landAreaM2: undefined,
  usefulRateUfM2: undefined,
  builtRateUfM2: undefined,
  landRateUfM2: undefined,
  bedrooms: undefined,
  bathrooms: undefined,
  parkingSpaces: undefined,
  constructionYear: undefined,
  floorNumber: undefined,
}

const emptyFactors: QualitativeFactors = {
  condition: 0,
  remodeling: 0,
  orientation: 0,
  floor: 0,
  light: 0,
  view: 0,
  noise: 0,
  commercialPotential: 0,
}

type CbrsBenchmark = {
  transactions: number
  priced_transactions: number
  median_price_uf: number | string | null
  median_area_m2: number | string | null
  median_uf_m2: number | string | null
  observed_at: string | null
}

type PortalBenchmark = {
  scope: string
  listing_count: number
  geocoded_count: number
  priced_count: number
  median_price_uf: number | string | null
  median_uf_m2: number | string | null
  median_area_m2: number | string | null
  top_seller: string | null
  observed_at: string | null
}

type SuggestedComparable = ValuationComparable & {
  quality?: 'canonical' | 'usable' | 'review' | 'reference_only'
  sourceReportedUfM2?: number
  observedAt?: string
  areaSemantics?: string
}

type SuggestResponse = {
  neighborhood: string
  suggestions: SuggestedComparable[]
  cbrsBenchmark: CbrsBenchmark | null
  portalBenchmark: PortalBenchmark | null
  notes: string[]
}

type RateAnchor = 'cbrs_median' | 'cbrs_average' | 'portal_median' | 'portal_average' | 'manual' | null

type EvidenceStats = {
  count: number
  minUfM2: number | null
  averageUfM2: number | null
  medianUfM2: number | null
  maxUfM2: number | null
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{children}</span>
}

function NumberField({ label, value, onChange, suffix, step = 1, min, max }: { label: string; value?: number; onChange: (value: number | undefined) => void; suffix?: string; step?: number; min?: number; max?: number }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><div className="flex border border-[var(--n3-line)] bg-[#080d0d] focus-within:border-[#d7332b]"><input type="number" step={step} min={min} max={max} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" />{suffix ? <span className="flex items-center border-l border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)]">{suffix}</span> : null}</div></label>
}

function TextField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><input value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><textarea rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full resize-y border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
}

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><input type="date" value={value ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(event) => onChange(event.target.value || undefined)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
}

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function blankComparable(index: number, type: ValuationSubject['propertyType'], sourceType: ValuationComparable['sourceType']): ValuationComparable {
  return {
    id: `cmp-${Date.now()}-${index}`,
    sourceType,
    sourceReference: '',
    address: '',
    neighborhood: '',
    propertyType: type,
    transactionDate: undefined,
    distanceMeters: undefined,
    totalAreaM2: undefined,
    usefulAreaM2: undefined,
    builtAreaM2: undefined,
    landAreaM2: undefined,
    priceUf: 0,
    priceUfM2: 0,
    similarityScore: 0,
    selected: false,
    adjustmentPct: 0,
  }
}

function summarizeEvidence(items: ValuationComparable[]): EvidenceStats {
  const values = items
    .map((item) => calculateCanonicalComparableUfM2(item))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
  if (!values.length) return { count: 0, minUfM2: null, averageUfM2: null, medianUfM2: null, maxUfM2: null }
  const middle = Math.floor(values.length / 2)
  const median = values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle]
  return {
    count: values.length,
    minUfM2: values[0],
    averageUfM2: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianUfM2: median,
    maxUfM2: values[values.length - 1],
  }
}

function formatUfM2(value: number | null | undefined) {
  return value == null ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m²`
}

function benchmarkValue(value: number | string | null | undefined, suffix = '') {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return '—'
  return `${parsed.toLocaleString('es-CL', { maximumFractionDigits: 1 })}${suffix}`
}

function formatObservedAt(value: string | null | undefined) {
  if (!value) return 'fecha no disponible'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'fecha no disponible' : date.toLocaleDateString('es-CL')
}

function rateAnchorLabel(anchor: RateAnchor) {
  const labels: Record<Exclude<RateAnchor, null>, string> = {
    cbrs_median: 'Mediana CBRS seleccionada',
    cbrs_average: 'Promedio CBRS seleccionado',
    portal_median: 'Mediana Portal seleccionada',
    portal_average: 'Promedio Portal seleccionado',
    manual: 'Definido por valorizador',
  }
  return anchor ? labels[anchor] : 'Pendiente de confirmación'
}

function Stepper({ step, onBackTo }: { step: ValuationWizardStep; onBackTo: (step: ValuationWizardStep) => void }) {
  return <div className="grid gap-2 md:grid-cols-5">{VALUATION_WIZARD_STEPS.map((item) => {
    const active = item.step === step
    const completed = item.step < step
    return <button key={item.step} type="button" disabled={!completed} onClick={() => completed && onBackTo(item.step)} className={`flex items-center gap-3 border px-3 py-3 text-left transition ${active ? 'border-[#d7332b] bg-[#130d0d]' : completed ? 'border-[var(--n3-line)] bg-[#0c1111] hover:border-[#d7332b]' : 'border-[var(--n3-line)] bg-[#080d0d] opacity-55'}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-[#d7332b] text-white' : completed ? 'bg-[#24302f] text-[#9fd0c8]' : 'bg-[#151919] text-[var(--n3-text-muted)]'}`}>{completed ? <Check size={14} /> : item.step}</span>
      <span><span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Paso {item.step}</span><strong className="mt-0.5 block text-xs">{item.shortLabel}</strong></span>
    </button>
  })}</div>
}

export default function ValuationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')
  const sourcePropertyId = searchParams.get('propertyId')
  const quickLookup = searchParams.get('quickLookup') === '1'
  const sourceEventKey = searchParams.get('eventKey') || undefined

  const [step, setStep] = useState<ValuationWizardStep>(quickLookup ? 2 : 1)
  const [manualOpen, setManualOpen] = useState(false)
  const [subject, setSubject] = useState<ValuationSubject>(emptySubject)
  const [currentStateNotes, setCurrentStateNotes] = useState('')
  const [professionalJustification, setProfessionalJustification] = useState('')
  const [comparables, setComparables] = useState<ValuationComparable[]>([])
  const [rateAnchor, setRateAnchor] = useState<RateAnchor>(null)
  const [cbrsBenchmark, setCbrsBenchmark] = useState<CbrsBenchmark | null>(null)
  const [portalBenchmark, setPortalBenchmark] = useState<PortalBenchmark | null>(null)
  const [suggestionNotes, setSuggestionNotes] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!quickLookup && !assignmentId) return
    const rawType = searchParams.get('propertyType') || 'Departamento'
    const propertyType: ValuationSubject['propertyType'] = rawType.toLowerCase().includes('casa') ? 'Casa' : 'Departamento'
    setSubject((current) => ({
      ...current,
      propertyType,
      address: searchParams.get('address') || current.address,
      neighborhood: searchParams.get('neighborhood') || current.neighborhood,
      rol: searchParams.get('rol') || current.rol,
      latitude: numberParam(searchParams.get('latitude')) ?? current.latitude,
      longitude: numberParam(searchParams.get('longitude')) ?? current.longitude,
      usefulAreaM2: numberParam(searchParams.get('usefulAreaM2')) ?? current.usefulAreaM2,
      builtAreaM2: numberParam(searchParams.get('builtAreaM2')) ?? current.builtAreaM2,
      landAreaM2: numberParam(searchParams.get('landAreaM2')) ?? current.landAreaM2,
      bedrooms: numberParam(searchParams.get('bedrooms')) ?? current.bedrooms,
      bathrooms: numberParam(searchParams.get('bathrooms')) ?? current.bathrooms,
      parkingSpaces: numberParam(searchParams.get('parkingSpaces')) ?? current.parkingSpaces,
      constructionYear: numberParam(searchParams.get('constructionYear')) ?? current.constructionYear,
    }))
    if (quickLookup) setStep(2)
  }, [assignmentId, quickLookup, searchParams])

  const result = useMemo(() => {
    try { return calculateContractualValuation(subject, comparables, emptyFactors) } catch { return null }
  }, [subject, comparables])

  const selectedComparables = useMemo(
    () => comparables.filter((item) => item.selected && item.priceUf > 0 && calculateCanonicalComparableUfM2(item) > 0),
    [comparables],
  )
  const cbrsEvidence = useMemo(() => summarizeEvidence(selectedComparables.filter((item) => item.sourceType === 'CBRS')), [selectedComparables])
  const portalEvidence = useMemo(() => summarizeEvidence(selectedComparables.filter((item) => item.sourceType === 'Portal' || item.sourceType === 'TocToc')), [selectedComparables])
  const evidenceAssessment = useMemo(() => assessValuationEvidence(comparables), [comparables])
  const comparableSignals = useMemo(
    () => new Map(buildComparableWorkbench(comparables).map((signal) => [signal.id, signal])),
    [comparables],
  )

  function updateSubject<K extends keyof ValuationSubject>(key: K, value: ValuationSubject[K]) {
    setSubject((current) => ({ ...current, [key]: value }))
  }

  function updateComparable(index: number, patch: Partial<ValuationComparable>) {
    setComparables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function addComparable(sourceType: ValuationComparable['sourceType']) {
    setComparables((current) => [...current, blankComparable(current.length + 1, subject.propertyType, sourceType)])
  }

  function goNext() {
    const reason = valuationWizardBlockingReason({ step, subject, selectedComparableCount: selectedComparables.length, hasResult: Boolean(result) })
    if (reason) {
      setMessage(reason)
      return
    }
    setMessage(null)
    if (step < 5) setStep((step + 1) as ValuationWizardStep)
  }

  function goBack() {
    setMessage(null)
    if (step > 1) setStep((step - 1) as ValuationWizardStep)
  }

  async function suggestComparables() {
    if (!subject.neighborhood.trim()) {
      setMessage('Confirma el barrio antes de analizar el mercado.')
      return
    }
    setSuggesting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/valuation/comparables/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: subject.propertyType,
          neighborhood: subject.neighborhood,
          address: subject.address,
          rol: subject.rol,
          eventKey: sourceEventKey,
          usefulAreaM2: subject.usefulAreaM2,
          builtAreaM2: subject.builtAreaM2,
          landAreaM2: subject.landAreaM2,
          bedrooms: subject.bedrooms,
          bathrooms: subject.bathrooms,
          latitude: subject.latitude,
          longitude: subject.longitude,
        }),
      })
      const payload = await response.json() as SuggestResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No fue posible analizar el mercado.')
      const existingRefs = new Set(comparables.map((item) => item.sourceReference).filter(Boolean))
      const fresh = payload.suggestions
        .filter((item) => !existingRefs.has(item.sourceReference))
        .map((item) => ({ ...item, selected: false }))
      setComparables((current) => [...current, ...fresh])
      setCbrsBenchmark(payload.cbrsBenchmark)
      setPortalBenchmark(payload.portalBenchmark)
      setSuggestionNotes(payload.notes || [])
      setMessage(fresh.length ? `Análisis listo: ${fresh.length} referencias encontradas. Revisa y selecciona las que correspondan.` : 'No encontramos referencias nuevas. Puedes agregar comparables manualmente.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible analizar el mercado.')
    } finally {
      setSuggesting(false)
    }
  }

  function adoptDepartmentRate(anchor: Exclude<RateAnchor, 'manual' | null>, value: number | null) {
    if (!value || value <= 0) return
    updateSubject('usefulRateUfM2', Number(value.toFixed(2)))
    setRateAnchor(anchor)
  }

  async function saveDraft() {
    if (!result) {
      setMessage('La valorización todavía no tiene un resultado canónico válido.')
      return
    }
    if (!professionalJustification.trim()) {
      setMessage('Agrega una justificación profesional antes de guardar.')
      return
    }
    for (const [index, item] of selectedComparables.entries()) {
      if (!item.sourceReference.trim()) { setMessage(`El comparable ${index + 1} requiere referencia de fuente.`); return }
      if (!item.address.trim()) { setMessage(`El comparable ${index + 1} requiere dirección.`); return }
      if (item.sourceType === 'CBRS' && !item.transactionDate) { setMessage(`El comparable CBRS ${index + 1} requiere fecha de transacción.`); return }
    }

    setSaving(true)
    setMessage(null)
    try {
      const normalized = comparables.map((item) => ({
        ...item,
        usefulAreaM2: item.sourceType === 'CBRS' && item.propertyType === 'Departamento' ? undefined : item.usefulAreaM2,
        totalAreaM2: item.sourceType === 'CBRS' && item.propertyType === 'Departamento' ? undefined : item.totalAreaM2,
        priceUfM2: calculateCanonicalComparableUfM2(item),
      }))
      const justification = [
        currentStateNotes.trim() ? `Estado actual declarado por el valorizador: ${currentStateNotes.trim()}` : '',
        professionalJustification.trim(),
      ].filter(Boolean).join('\n\n')

      const response = await fetch('/api/valuation/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          comparables: normalized,
          qualitativeFactors: emptyFactors,
          justification,
          decision: { rateAnchor },
          propertyAssignmentId: assignmentId,
          sourcePropertyId,
        }),
      })
      const payload = await response.json() as { caseId?: string; error?: string }
      if (!response.ok) throw new Error(payload.error || 'No fue posible guardar la valorización.')
      if (!payload.caseId) throw new Error('La API no devolvió el identificador del caso.')
      router.push(`/dashboard/valuations/${payload.caseId}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible guardar la valorización.')
    } finally {
      setSaving(false)
    }
  }

  return <IntelligencePage>
    <IntelligenceHeader
      eyebrow="Módulo II · Valorización"
      title="Valorizador Property Partners"
      description="Flujo guiado: identifica la propiedad, completa lo que cambió, revisa el mercado y confirma la decisión profesional."
      actions={[{ label: 'Registro de valorizaciones', href: '/dashboard/valuations' }, { label: 'Inteligencia de mercado', href: '/dashboard/market' }]}
      meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">property-partners-valuation-v2</div>}
    />

    <Stepper step={step} onBackTo={setStep} />

    {step === 1 ? <section className="space-y-4">
      <QuickSubjectLookup />
      <div className="text-center"><button type="button" onClick={() => setManualOpen((value) => !value)} className="text-xs text-[var(--n3-text-muted)] underline underline-offset-4 hover:text-white">{manualOpen ? 'Ocultar ingreso manual' : 'No encuentro la propiedad · ingresar manualmente'}</button></div>
      {manualOpen ? <IntelligencePanel eyebrow="Alternativa" title="Ingreso manual" description="Úsalo solo cuando la propiedad no exista todavía en las fuentes canónicas."><div className="grid gap-4 p-5 md:grid-cols-2">
        <label className="block"><FieldLabel>Tipo</FieldLabel><select value={subject.propertyType} onChange={(event) => updateSubject('propertyType', event.target.value as ValuationSubject['propertyType'])} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Departamento</option><option>Casa</option></select></label>
        <TextField label="Dirección" value={subject.address} onChange={(value) => updateSubject('address', value)} placeholder="Calle y número" />
        <TextField label="Barrio / sector" value={subject.neighborhood} onChange={(value) => updateSubject('neighborhood', value)} placeholder="Barrio canónico" />
        <TextField label="ROL si existe" value={subject.rol} onChange={(value) => updateSubject('rol', value)} />
      </div></IntelligencePanel> : null}
    </section> : null}

    {step === 2 ? <section className="space-y-4">
      <IntelligencePanel eyebrow="Paso 2 · Estado actual" title="Completa solo lo que puede haber cambiado" description="Los datos canónicos encontrados se mantienen como referencia. Aquí agregas la condición actual del inmueble."><div className="p-5">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="border border-[var(--n3-line)] p-3 md:col-span-2"><FieldLabel>Propiedad</FieldLabel><strong className="text-sm">{subject.address || 'Sin dirección'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{subject.neighborhood || 'Barrio pendiente'} · ROL {subject.rol || 'no disponible'}</p></div>
          <div className="border border-[var(--n3-line)] p-3"><FieldLabel>Programa</FieldLabel><strong className="text-sm">{subject.bedrooms ?? '—'}D / {subject.bathrooms ?? '—'}B</strong></div>
          <div className="border border-[var(--n3-line)] p-3"><FieldLabel>Año</FieldLabel><strong className="text-sm">{subject.constructionYear ?? '—'}</strong></div>
          <div className="border border-[var(--n3-line)] p-3"><FieldLabel>Origen</FieldLabel><strong className="text-sm">{quickLookup ? 'Dato canónico' : 'Ingreso manual'}</strong></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {subject.propertyType === 'Departamento' ? <>
            <NumberField label="M² útiles confirmados" value={subject.usefulAreaM2} onChange={(value) => updateSubject('usefulAreaM2', value)} suffix="m²" step={0.1} min={0} />
            <NumberField label="M² terraza / uso y goce" value={subject.terraceAreaM2} onChange={(value) => updateSubject('terraceAreaM2', value)} suffix="m²" step={0.1} min={0} />
            <NumberField label="Piso" value={subject.floorNumber} onChange={(value) => updateSubject('floorNumber', value)} />
          </> : <>
            <NumberField label="M² construidos" value={subject.builtAreaM2} onChange={(value) => updateSubject('builtAreaM2', value)} suffix="m²" step={0.1} min={0} />
            <NumberField label="M² terreno" value={subject.landAreaM2} onChange={(value) => updateSubject('landAreaM2', value)} suffix="m²" step={0.1} min={0} />
          </>}
          <NumberField label="Dormitorios" value={subject.bedrooms} onChange={(value) => updateSubject('bedrooms', value)} min={0} />
          <NumberField label="Baños" value={subject.bathrooms} onChange={(value) => updateSubject('bathrooms', value)} min={0} />
          <NumberField label="Estacionamientos" value={subject.parkingSpaces} onChange={(value) => updateSubject('parkingSpaces', value)} min={0} />
        </div>
        <div className="mt-5"><TextAreaField label="Estado actual / atributos relevantes" value={currentStateNotes} onChange={setCurrentStateNotes} placeholder="Ej.: remodelación completa, cocina integrada, bodega grande, quincho, parrillas, orientación, vista, estado de conservación, terraza de uso y goce, etc." /></div>
      </div></IntelligencePanel>
      <MethodologyNote>Los atributos cualitativos quedan documentados como evidencia profesional. No generan porcentajes automáticos inventados.</MethodologyNote>
    </section> : null}

    {step === 3 ? <section className="space-y-4">
      <IntelligencePanel eyebrow="Paso 3 · Mercado" title="Oferta y ventas comparables" description="El sistema propone evidencia; el valorizador decide qué referencias usar."><div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><p className="text-sm font-semibold">{subject.address}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{subject.neighborhood} · {subject.propertyType}</p></div>
        <button type="button" disabled={suggesting} onClick={() => void suggestComparables()} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Sparkles size={14} />{suggesting ? 'Analizando…' : comparables.length ? 'Actualizar análisis' : 'Analizar mercado'}</button>
      </div></IntelligencePanel>

      {(cbrsBenchmark || portalBenchmark) ? <MetricGrid>
        <MetricCard label="Ventas CBRS" value={cbrsBenchmark ? cbrsBenchmark.transactions.toLocaleString('es-CL') : '—'} detail={cbrsBenchmark ? `Mediana ${benchmarkValue(cbrsBenchmark.median_uf_m2, ' UF/m²')}` : 'Sin benchmark'} />
        <MetricCard label="Oferta Portal" value={portalBenchmark ? portalBenchmark.listing_count.toLocaleString('es-CL') : '—'} detail={portalBenchmark ? `Mediana ${benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²')}` : 'Sin benchmark'} />
        <MetricCard label="Seleccionados" value={selectedComparables.length.toLocaleString('es-CL')} detail="La selección es siempre humana." />
        <MetricCard label="Confianza de evidencia" value={`${evidenceAssessment.grade} · ${evidenceAssessment.score}/100`} detail={evidenceAssessment.summary} />
      </MetricGrid> : null}

      {!comparables.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-center"><p className="text-sm font-semibold">Todavía no hay comparables</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Pulsa “Analizar mercado”. También puedes agregar una referencia manual si es necesario.</p></div> : null}

      <div className="space-y-3">{comparables.map((item, index) => {
        const suggested = item as SuggestedComparable
        const canonicalUfM2 = calculateCanonicalComparableUfM2(item)
        const referenceOnly = suggested.quality === 'reference_only'
        const sourceArea = item.propertyType === 'Casa' ? item.builtAreaM2 : (item.builtAreaM2 ?? item.usefulAreaM2)
        const manual = item.id.startsWith('cmp-')
        const signal = comparableSignals.get(item.id)
        return <div key={item.id} className={`border ${item.selected ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'} bg-[#0c1111]`}>
          <div className="flex flex-wrap items-center gap-4 p-4">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={referenceOnly} checked={referenceOnly ? false : item.selected} onChange={(event) => updateComparable(index, { selected: event.target.checked })} />{referenceOnly ? 'Referencia' : 'Usar'}</label>
            {signal ? <div className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${signal.isOutlier ? 'border-[#806f37] text-[#d6bd72]' : signal.tier === 'Prioritario' ? 'border-[#376d64] text-[#9fd0c8]' : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>{signal.tier} · {signal.score}/100</div> : null}
            <div className="min-w-[220px] flex-1"><p className="text-sm font-semibold">{item.address || 'Comparable sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.sourceType} · {item.transactionDate || (suggested.observedAt ? `observado ${formatObservedAt(suggested.observedAt)}` : 'fecha no disponible')}</p></div>
            <div className="text-right"><p className="text-sm font-semibold">{item.priceUf > 0 ? `${item.priceUf.toLocaleString('es-CL')} UF` : 'Precio pendiente'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{canonicalUfM2 > 0 ? `${canonicalUfM2.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m²` : suggested.sourceReportedUfM2 ? `${suggested.sourceReportedUfM2.toLocaleString('es-CL')} UF/m² fuente` : 'UF/m² pendiente'}{sourceArea ? ` · ${sourceArea} m²` : ''}</p></div>
            <div className="text-right text-xs text-[var(--n3-text-muted)]">{item.distanceMeters !== undefined ? `${item.distanceMeters.toLocaleString('es-CL')} m` : 'distancia —'}<br />similitud {Math.round(item.similarityScore * 100)}%</div>
          </div>
          {referenceOnly ? <div className="border-t border-[var(--n3-line)] px-4 py-3 text-xs text-[#c4ae70]">Oferta visible como referencia, pero no seleccionable hasta contar con superficie canónica completa.</div> : null}
          {signal && (signal.risks.length > 0 || signal.strengths.length > 0) ? <div className="grid gap-2 border-t border-[var(--n3-line)] px-4 py-3 text-xs md:grid-cols-2">
            <p className="text-[#9fd0c8]"><strong>Fortalezas:</strong> {signal.strengths.slice(0, 3).join(' · ') || 'Sin fortalezas verificables'}</p>
            <p className={signal.isOutlier ? 'text-[#d6bd72]' : 'text-[var(--n3-text-muted)]'}><strong>Revisar:</strong> {signal.risks.slice(0, 3).join(' · ') || 'Sin alertas relevantes'}</p>
          </div> : null}
          <details className="border-t border-[var(--n3-line)]"><summary className="cursor-pointer px-4 py-3 text-xs text-[var(--n3-text-muted)]">{manual ? 'Completar comparable manual' : 'Ver / editar detalles'}</summary><div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
            <label className="block"><FieldLabel>Fuente</FieldLabel><select value={item.sourceType} onChange={(event) => updateComparable(index, { sourceType: event.target.value as ValuationComparable['sourceType'] })} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Portal</option><option>TocToc</option><option>CBRS</option><option>Cliente</option></select></label>
            <TextField label="Referencia / URL" value={item.sourceReference} onChange={(value) => updateComparable(index, { sourceReference: value })} />
            <TextField label="Dirección" value={item.address} onChange={(value) => updateComparable(index, { address: value })} />
            <TextField label="Barrio" value={item.neighborhood} onChange={(value) => updateComparable(index, { neighborhood: value })} />
            <NumberField label="Precio UF" value={item.priceUf > 0 ? item.priceUf : undefined} onChange={(value) => updateComparable(index, { priceUf: value ?? 0 })} suffix="UF" min={0} />
            {item.sourceType === 'CBRS' ? <DateField label="Fecha venta" value={item.transactionDate} onChange={(value) => updateComparable(index, { transactionDate: value })} /> : null}
            {item.propertyType === 'Departamento' && item.sourceType !== 'CBRS' ? <><NumberField label="M² útiles" value={item.usefulAreaM2} onChange={(value) => updateComparable(index, { usefulAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="M² totales" value={item.totalAreaM2} onChange={(value) => updateComparable(index, { totalAreaM2: value })} suffix="m²" step={0.1} min={0} /></> : null}
            {item.propertyType === 'Departamento' && item.sourceType === 'CBRS' ? <NumberField label="Superficie registrada CBRS" value={item.builtAreaM2} onChange={(value) => updateComparable(index, { builtAreaM2: value, usefulAreaM2: undefined, totalAreaM2: undefined })} suffix="m²" step={0.1} min={0} /> : null}
            {item.propertyType === 'Casa' ? <><NumberField label="M² construidos" value={item.builtAreaM2} onChange={(value) => updateComparable(index, { builtAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="M² terreno" value={item.landAreaM2} onChange={(value) => updateComparable(index, { landAreaM2: value })} suffix="m²" step={0.1} min={0} /></> : null}
            {!item.selected ? <div className="md:col-span-2 xl:col-span-3"><TextAreaField label="Motivo de exclusión / revisión" value={item.adjustmentNotes ?? ''} onChange={(value) => updateComparable(index, { adjustmentNotes: value })} placeholder="Ej.: superficie no comparable, ubicación secundaria, outlier de precio o evidencia incompleta." /></div> : null}
            <button type="button" onClick={() => setComparables((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center justify-center gap-2 border border-[var(--n3-line)] px-3 py-3 text-xs hover:border-[#d7332b]"><Trash2 size={14} />Eliminar</button>
          </div></details>
        </div>
      })}</div>

      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => addComparable('CBRS')} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]"><Plus size={14} />Venta manual</button><button type="button" onClick={() => addComparable('Portal')} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]"><Plus size={14} />Oferta manual</button></div>
      {suggestionNotes.length ? <details className="border border-[var(--n3-line)] bg-[#0c1111]"><summary className="cursor-pointer px-4 py-3 text-xs text-[var(--n3-text-muted)]">Notas metodológicas del análisis</summary><div className="border-t border-[var(--n3-line)] p-4 text-xs leading-6 text-[var(--n3-text-muted)]">{suggestionNotes.join(' ')}</div></details> : null}
    </section> : null}

    {step === 4 ? <section className="space-y-4">
      <MetricGrid>
        <MetricCard label="Pilar 1 · Oferta" value={portalEvidence.count.toLocaleString('es-CL')} detail={`Mediana seleccionada ${formatUfM2(portalEvidence.medianUfM2)} · benchmark ${portalBenchmark ? benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²') : '—'}`} />
        <MetricCard label="Pilar 2 · Ventas" value={cbrsEvidence.count.toLocaleString('es-CL')} detail={`Mediana seleccionada ${formatUfM2(cbrsEvidence.medianUfM2)} · benchmark ${cbrsBenchmark ? benchmarkValue(cbrsBenchmark.median_uf_m2, ' UF/m²') : '—'}`} />
        <MetricCard label="Pilar 3 · Método PP" value={`${evidenceAssessment.grade} · ${evidenceAssessment.score}/100`} detail={subject.propertyType === 'Departamento' ? 'm² útiles × UF/m² confirmado' : 'construcción × tasa + terreno × tasa'} />
        <MetricCard label="Comparables" value={selectedComparables.length.toLocaleString('es-CL')} detail="Confirmados por el valorizador." />
      </MetricGrid>

      <IntelligencePanel eyebrow="Paso 4 · Decisión" title="Confirma la tasa profesional" description="La evidencia orienta la decisión; el sistema no adopta una tasa sin confirmación humana."><div className="p-5">
        {subject.propertyType === 'Departamento' ? <>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!cbrsEvidence.medianUfM2} onClick={() => adoptDepartmentRate('cbrs_median', cbrsEvidence.medianUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar mediana CBRS</button>
            <button type="button" disabled={!cbrsEvidence.averageUfM2} onClick={() => adoptDepartmentRate('cbrs_average', cbrsEvidence.averageUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar promedio CBRS</button>
            <button type="button" disabled={!portalEvidence.medianUfM2} onClick={() => adoptDepartmentRate('portal_median', portalEvidence.medianUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar mediana Portal</button>
            <button type="button" disabled={!portalEvidence.averageUfM2} onClick={() => adoptDepartmentRate('portal_average', portalEvidence.averageUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar promedio Portal</button>
          </div>
          <div className="mt-5 max-w-sm"><NumberField label="UF/m² adoptado" value={subject.usefulRateUfM2} onChange={(value) => { updateSubject('usefulRateUfM2', value); setRateAnchor(value === undefined ? null : 'manual') }} suffix="UF/m²" step={0.1} min={0} /></div>
          <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Origen de la decisión: {rateAnchorLabel(rateAnchor)}.</p>
        </> : <div className="grid gap-4 md:grid-cols-2"><NumberField label="UF/m² construcción adoptado" value={subject.builtRateUfM2} onChange={(value) => updateSubject('builtRateUfM2', value)} suffix="UF/m²" step={0.1} min={0} /><NumberField label="UF/m² terreno adoptado" value={subject.landRateUfM2} onChange={(value) => updateSubject('landRateUfM2', value)} suffix="UF/m²" step={0.1} min={0} /></div>}
      </div></IntelligencePanel>

      <IntelligencePanel eyebrow="Estrategia comercial" title={result ? result.commercialStrategy.posture : 'Pendiente de confirmar tasa'} description={result ? result.commercialStrategy.rationale : 'Selecciona una ancla o ingresa la tasa profesional.'}>{result ? <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="border border-[#d7332b] bg-[#130d0d] p-4"><FieldLabel>Valor objetivo</FieldLabel><strong className="text-xl">{Math.round(result.commercialStrategy.objectivePriceUf).toLocaleString('es-CL')} UF</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Valor comercial defendible</p></div>
          <div className="border border-[#376d64] bg-[#0b1412] p-4"><FieldLabel>Publicación recomendada</FieldLabel><strong className="text-xl">{Math.round(result.commercialStrategy.recommendedPublicationUf).toLocaleString('es-CL')} UF</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Posición sugerida según evidencia</p></div>
          <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Margen de negociación</FieldLabel><strong className="text-xl">{Math.round(result.commercialStrategy.negotiationMarginUf).toLocaleString('es-CL')} UF</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{result.commercialStrategy.negotiationMarginPct.toLocaleString('es-CL')}% sobre el objetivo</p></div>
          <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Alternativa aspiracional</FieldLabel><strong className="text-xl">{Math.round(result.commercialStrategy.aspirationalPublicationUf).toLocaleString('es-CL')} UF</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Escenario máximo, no recomendación automática</p></div>
        </div>
        <div className="border-l-2 border-[#376d64] bg-[#0b1412] px-4 py-3"><FieldLabel>Cómo explicarlo al propietario</FieldLabel><p className="text-sm leading-6 text-[var(--n3-text-muted)]">{result.commercialStrategy.ownerNarrative}</p></div>
        <details className="border border-[var(--n3-line)]"><summary className="cursor-pointer px-4 py-3 text-xs text-[var(--n3-text-muted)]">Ver los tres escenarios contractuales</summary><div className="grid gap-3 border-t border-[var(--n3-line)] p-4 md:grid-cols-3">{result.publicationScenarios.map((scenario) => <div key={scenario.upliftPct} className="border border-[var(--n3-line)] p-4"><FieldLabel>Publicación · margen {scenario.upliftPct}%</FieldLabel><strong className="text-lg">{Math.round(scenario.suggestedPriceUf).toLocaleString('es-CL')} UF</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{scenario.suggestedUfM2.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m² ponderado</p></div>)}</div></details>
      </div> : <div className="p-5 text-sm text-[var(--n3-text-muted)]">La estrategia aparece cuando la decisión profesional cumple la metodología.</div>}</IntelligencePanel>
    </section> : null}

    {step === 5 ? <section className="space-y-4">
      <IntelligencePanel eyebrow="Paso 5 · Revisión" title="Revisa antes de guardar" description="Este es el resumen que quedará trazado en el expediente."><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="border border-[var(--n3-line)] p-4 xl:col-span-2"><FieldLabel>Propiedad</FieldLabel><strong className="text-sm">{subject.address}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{subject.neighborhood} · {subject.propertyType} · ROL {subject.rol || 'no disponible'}</p></div>
        <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Evidencia</FieldLabel><strong className="text-xl">{selectedComparables.length}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{cbrsEvidence.count} ventas · {portalEvidence.count} ofertas</p></div>
        <div className="border border-[#d7332b] bg-[#130d0d] p-4"><FieldLabel>Valor comercial</FieldLabel><strong className="text-xl">{result ? `${Math.round(result.adjustedValueUf).toLocaleString('es-CL')} UF` : '—'}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{subject.propertyType === 'Departamento' ? rateAnchorLabel(rateAnchor) : 'Tasas construcción + terreno'}</p></div>
      </div>
      {currentStateNotes.trim() ? <div className="border-t border-[var(--n3-line)] p-5"><FieldLabel>Estado actual declarado</FieldLabel><p className="text-sm leading-6 text-[var(--n3-text-muted)]">{currentStateNotes}</p></div> : null}
      </IntelligencePanel>
      {result ? <IntelligencePanel eyebrow="Resumen comercial" title={`${Math.round(result.commercialStrategy.recommendedPublicationUf).toLocaleString('es-CL')} UF para publicar`} description={result.commercialStrategy.rationale}><div className="grid gap-4 p-5 md:grid-cols-3">
        <div><FieldLabel>Objetivo defendible</FieldLabel><strong>{Math.round(result.commercialStrategy.objectivePriceUf).toLocaleString('es-CL')} UF</strong></div>
        <div><FieldLabel>Margen disponible</FieldLabel><strong>{Math.round(result.commercialStrategy.negotiationMarginUf).toLocaleString('es-CL')} UF</strong></div>
        <div><FieldLabel>Confianza</FieldLabel><strong>{evidenceAssessment.grade} · {evidenceAssessment.score}/100</strong></div>
        <p className="border-t border-[var(--n3-line)] pt-4 text-sm leading-6 text-[var(--n3-text-muted)] md:col-span-3">{result.commercialStrategy.ownerNarrative}</p>
      </div></IntelligencePanel> : null}
      <IntelligencePanel eyebrow="Criterio profesional" title="Justificación del valorizador" description="Explica por qué esta evidencia y esta tasa representan correctamente el inmueble."><div className="p-5"><TextAreaField label="Justificación profesional" value={professionalJustification} onChange={setProfessionalJustification} placeholder="Ej.: se privilegian ventas recientes de superficie y ubicación comparables; la remodelación integral y la terraza de uso y goce sustentan una posición en la parte alta del rango observado..." /></div></IntelligencePanel>
      <MethodologyNote>Property Partners decide el método. Portal describe la oferta. CBRS describe las ventas. El valorizador toma la decisión profesional.</MethodologyNote>
    </section> : null}

    {message ? <div role="status" className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-sm text-[#ff9a93]">{message}</div> : null}

    <div className="sticky bottom-0 z-20 -mx-2 mt-2 border-t border-[var(--n3-line)] bg-[#050808]/95 px-2 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={step === 1} onClick={goBack} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-4 py-2.5 text-xs font-semibold disabled:opacity-30"><ArrowLeft size={14} />Anterior</button>
        <div className="hidden text-center text-xs text-[var(--n3-text-muted)] md:block">Paso {step} de 5 · {VALUATION_WIZARD_STEPS.find((item) => item.step === step)?.label}</div>
        {step < 5 ? <button type="button" onClick={goNext} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white">Continuar <ArrowRight size={14} /></button> : <button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex items-center gap-2 bg-[#d7332b] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save size={15} />{saving ? 'Guardando…' : 'Guardar valorización trazable'}</button>}
      </div>
    </div>
  </IntelligencePage>
}
