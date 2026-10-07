'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import {
  calculateCanonicalComparableUfM2,
  calculateContractualValuation,
  type QualitativeFactors,
  type ValuationComparable,
  type ValuationSubject,
} from '@/lib/valuation-contract'
import {
  buildValuationSecondOpinion,
  type ValuationSecondOpinion,
} from '@/lib/valuation-second-opinion'
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
import { createClient } from '@/lib/supabase/client'
import { canUnlockV2Features } from '@/lib/v2-feature-access'

const emptySubject: ValuationSubject = {
  propertyType: 'Casa',
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

type HouseRecommendation = {
  weightedRateUfM2: number
  builtRateUfM2: number
  landRateUfM2: number
  estimatedValueUf: number
  comparableCount: number
  strictComparableCount: number
  averageSimilarity: number
  comparableSpread: number
  confidence: 'high' | 'medium' | 'low'
  evidenceGate: string
  nonBinding: boolean
  method: string
}

type SuggestResponse = {
  neighborhood: string
  suggestions: SuggestedComparable[]
  cbrsBenchmark: CbrsBenchmark | null
  portalBenchmark: PortalBenchmark | null
  houseRecommendation?: HouseRecommendation | null
  notes: string[]
}

type RateAnchor = 'cbrs_median' | 'cbrs_average' | 'portal_median' | 'portal_average' | 'champion_v5' | 'manual' | null

type EvidenceStats = {
  count: number
  minUfM2: number | null
  averageUfM2: number | null
  medianUfM2: number | null
  maxUfM2: number | null
}

type MethodologySummary = {
  weightedAverageUfM2: number | null
  dispersionPct: number | null
  outlierIds: string[]
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

function summarizeMethodology(items: ValuationComparable[]): MethodologySummary {
  const evidence = items
    .map((item) => ({
      id: item.id,
      value: calculateCanonicalComparableUfM2(item),
      weight: Math.max(item.similarityScore, 0.01),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)

  if (!evidence.length) return { weightedAverageUfM2: null, dispersionPct: null, outlierIds: [] }

  const values = evidence.map((item) => item.value).sort((a, b) => a - b)
  const middle = Math.floor(values.length / 2)
  const median = values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle]
  const totalWeight = evidence.reduce((sum, item) => sum + item.weight, 0)
  const weightedAverageUfM2 = evidence.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
  const dispersionPct = median > 0 ? ((values[values.length - 1] - values[0]) / median) * 100 : null
  const outlierIds = median > 0
    ? evidence.filter((item) => Math.abs(item.value - median) / median > 0.25).map((item) => item.id)
    : []

  return { weightedAverageUfM2, dispersionPct, outlierIds }
}

function evidenceQuality(cbrs: EvidenceStats, portal: EvidenceStats) {
  if (cbrs.count >= 3 && portal.count >= 2) return { label: 'Alta', reason: `${cbrs.count} ventas + ${portal.count} ofertas seleccionadas` }
  if (cbrs.count >= 2 || portal.count >= 2) return { label: 'Media', reason: `${cbrs.count} ventas + ${portal.count} ofertas seleccionadas` }
  return { label: 'Baja', reason: 'Muestra seleccionada insuficiente' }
}

function formatUfM2(value: number | null | undefined) {
  return value == null ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: 6 })} UF/m²`
}

function benchmarkValue(value: number | string | null | undefined, suffix = '') {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return '—'
  return `${parsed.toLocaleString('es-CL', { maximumFractionDigits: 6 })}${suffix}`
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
    champion_v5: 'Referencia sugerida confirmada',
    manual: 'Definido por valorizador',
  }
  return anchor ? labels[anchor] : 'Pendiente de confirmación'
}

function Stepper({ step, onBackTo }: { step: ValuationWizardStep; onBackTo: (step: ValuationWizardStep) => void }) {
  return <div className="grid grid-cols-5 gap-1.5 md:gap-2">{VALUATION_WIZARD_STEPS.map((item) => {
    const active = item.step === step
    const completed = item.step < step
    return <button key={item.step} type="button" aria-label={`Paso ${item.step}: ${item.label}`} aria-current={active ? 'step' : undefined} disabled={!completed} onClick={() => completed && onBackTo(item.step)} className={`flex min-h-11 items-center justify-center gap-2 border px-1.5 py-2 text-center transition md:justify-start md:px-3 md:py-3 md:text-left ${active ? 'border-[#d7332b] bg-[#130d0d]' : completed ? 'border-[var(--n3-line)] bg-[#0c1111] hover:border-[#d7332b]' : 'border-[var(--n3-line)] bg-[#080d0d] opacity-55'}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-[#d7332b] text-white' : completed ? 'bg-[#24302f] text-[#9fd0c8]' : 'bg-[#151919] text-[var(--n3-text-muted)]'}`}>{completed ? <Check size={14} /> : item.step}</span>
      <span className="hidden md:block"><span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Paso {item.step}</span><strong className="mt-0.5 block text-xs">{item.shortLabel}</strong></span>
    </button>
  })}</div>
}

function SecondOpinionPanel({ opinion }: { opinion: ValuationSecondOpinion }) {
  const toneClass = {
    attention: 'border-[#c4ae70]/45 bg-[#17140c]',
    context: 'border-[var(--n3-line)] bg-[#0a1010]',
    positive: 'border-[#5f8f82]/45 bg-[#0a1210]',
  }

  return <aside aria-label="Lectura de apoyo no vinculante" className="border border-[#5f8f82]/55 bg-[#0b1211]">
    <div className="flex flex-wrap items-start justify-between gap-3 p-5">
      <div><FieldLabel>Apoyo a la decisión · no vinculante</FieldLabel><h3 className="text-base font-semibold">Lectura de la evidencia</h3></div>
      <div className="border border-[var(--n3-line)] px-3 py-2 text-right"><FieldLabel>Cobertura</FieldLabel><strong className="text-sm">{opinion.coverage}</strong></div>
    </div>
    <div className="grid gap-2 border-t border-[var(--n3-line)] p-4 md:grid-cols-2">
      {opinion.findings.map((finding) => <div key={`${finding.title}-${finding.evidence}`} className={`border p-4 ${toneClass[finding.tone]}`}>
        <strong className="text-sm">{finding.title}</strong>
        <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{finding.detail}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-[#9fd0c8]">{finding.evidence}</p>
      </div>)}
    </div>
    <div className="border-t border-[var(--n3-line)] px-5 py-3 text-[11px] leading-5 text-[var(--n3-text-muted)]">{opinion.disclaimer}</div>
  </aside>
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
  const [houseRecommendation, setHouseRecommendation] = useState<HouseRecommendation | null>(null)
  const [suggestionNotes, setSuggestionNotes] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [v2Unlocked, setV2Unlocked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setV2Unlocked(canUnlockV2Features(data.user)))
  }, [])

  useEffect(() => {
    if (!quickLookup && !assignmentId) return
    const rawType = searchParams.get('propertyType') || 'Casa'
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
  const recommendedComparableIds = useMemo(() => comparables
    .filter((item) => {
      const suggested = item as SuggestedComparable
      return item.sourceType === 'CBRS' &&
        !item.id.startsWith('cmp-') &&
        (suggested.quality === 'canonical' || suggested.quality === 'usable') &&
        item.priceUf > 0 &&
        calculateCanonicalComparableUfM2(item) > 0
    })
    .slice(0, 3)
    .map((item) => item.id), [comparables])
  const cbrsEvidence = useMemo(() => summarizeEvidence(selectedComparables.filter((item) => item.sourceType === 'CBRS')), [selectedComparables])
  const portalEvidence = useMemo(() => summarizeEvidence(selectedComparables.filter((item) => item.sourceType === 'Portal' || item.sourceType === 'TocToc')), [selectedComparables])
  const quality = useMemo(() => evidenceQuality(cbrsEvidence, portalEvidence), [cbrsEvidence, portalEvidence])
  const methodologySummary = useMemo(() => summarizeMethodology(selectedComparables), [selectedComparables])
  const secondOpinion = useMemo(() => buildValuationSecondOpinion({
    subject,
    comparables,
    result,
    hasCurrentStateNotes: Boolean(currentStateNotes.trim()),
  }), [subject, comparables, result, currentStateNotes])

  function updateSubject<K extends keyof ValuationSubject>(key: K, value: ValuationSubject[K]) {
    setSubject((current) => ({ ...current, [key]: value }))
  }

  function updateComparable(index: number, patch: Partial<ValuationComparable>) {
    setComparables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function addComparable(sourceType: ValuationComparable['sourceType']) {
    setComparables((current) => [...current, blankComparable(current.length + 1, subject.propertyType, sourceType)])
  }

  function useRecommendedComparables() {
    if (recommendedComparableIds.length < 3) return
    const recommended = new Set(recommendedComparableIds)
    setComparables((current) => current.map((item) => ({
      ...item,
      selected: recommended.has(item.id) ? true : item.selected,
    })))
    setMessage('Seleccionamos 3 ventas recomendadas. Revísalas antes de continuar.')
  }

  function goNext() {
    if (step === 3 && selectedComparables.some((item) => !item.adjustmentNotes?.trim())) {
      setMessage('Explica cada comparable.')
      return
    }
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
      setMessage('Confirma el barrio.')
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
          constructionYear: subject.constructionYear,
          latitude: subject.latitude,
          longitude: subject.longitude,
        }),
      })
      const payload = await response.json() as SuggestResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Error al analizar el mercado.')
      const existingRefs = new Set(comparables.map((item) => item.sourceReference).filter(Boolean))
      const fresh = payload.suggestions
        .filter((item) => !existingRefs.has(item.sourceReference))
        .map((item) => ({ ...item, selected: false }))
      setComparables((current) => [...current, ...fresh])
      setCbrsBenchmark(payload.cbrsBenchmark)
      setPortalBenchmark(payload.portalBenchmark)
      setHouseRecommendation(payload.houseRecommendation ?? null)
      setSuggestionNotes(payload.notes || [])
      setMessage(fresh.length ? `${fresh.length} referencias encontradas.` : 'Sin referencias nuevas.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al analizar el mercado.')
    } finally {
      setSuggesting(false)
    }
  }

  function adoptDepartmentRate(anchor: Exclude<RateAnchor, 'manual' | null>, value: number | null) {
    if (!value || value <= 0) return
    updateSubject('usefulRateUfM2', value)
    setRateAnchor(anchor)
  }

  function adoptHouseRecommendation() {
    if (!houseRecommendation) return
    updateSubject('builtRateUfM2', houseRecommendation.builtRateUfM2)
    updateSubject('landRateUfM2', houseRecommendation.landRateUfM2)
    setRateAnchor('champion_v5')
    setMessage('Referencia sugerida aplicada. Puedes ajustarla si corresponde.')
  }

  function draftProfessionalJustification() {
    if (selectedComparables.length < 3) return
    const sales = selectedComparables.filter((item) => item.sourceType === 'CBRS').length
    const offers = selectedComparables.filter((item) => item.sourceType === 'Portal' || item.sourceType === 'TocToc').length
    const range = summarizeEvidence(selectedComparables)
    const parts = [
      `Se revisaron ${selectedComparables.length} comparables seleccionados (${sales} ventas registradas${offers ? ` y ${offers} ofertas observadas` : ''}) del mercado relevante.`,
      range.medianUfM2 ? `La mediana de la muestra es ${range.medianUfM2.toLocaleString('es-CL', { maximumFractionDigits: 6 })} UF/m².` : '',
      subject.propertyType === 'Casa'
        ? 'La decisión considera superficie construida, terreno, año, programa, recencia y ubicación, manteniendo la tasa final bajo criterio profesional de Property Partners.'
        : 'La decisión considera superficie útil, terraza cuando corresponde, recencia, ubicación y evidencia seleccionada, manteniendo la tasa final bajo criterio profesional de Property Partners.',
      currentStateNotes.trim() ? `Estado actual informado: ${currentStateNotes.trim()}` : '',
    ].filter(Boolean)
    setProfessionalJustification(parts.join(' '))
  }

  async function saveDraft() {
    if (!subject.address.trim() || !subject.neighborhood.trim()) {
      setMessage('Completa dirección y barrio.')
      return
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

      const response = await fetch('/api/valuation/drafts', {
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
      if (!response.ok) throw new Error(payload.error || 'Error al guardar.')
      if (!payload.caseId) throw new Error('Borrador sin identificador.')
      router.push(`/dashboard/valuations/${payload.caseId}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  return <IntelligencePage>
    <IntelligenceHeader
      eyebrow="Valorizaciones"
      title="Nueva valorización"
      description="Busca la propiedad, revisa la evidencia y define el valor para trabajar con el cliente."
      actions={[{ label: 'Registro de valorizaciones', href: '/dashboard/valuations' }, { label: 'Inteligencia de mercado', href: '/dashboard/market' }]}

    />

    <Stepper step={step} onBackTo={setStep} />

    {step === 1 ? <section className="space-y-4">
      <QuickSubjectLookup />
      <div className="text-center"><button type="button" onClick={() => setManualOpen((value) => !value)} className="text-xs text-[var(--n3-text-muted)] underline underline-offset-4 hover:text-white">{manualOpen ? 'Ocultar ingreso manual' : 'Ingreso manual'}</button></div>
      {manualOpen ? <IntelligencePanel eyebrow="Alternativa" title="Ingreso manual" description="Úsalo sólo si la propiedad no aparece en la búsqueda."><div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="block"><FieldLabel>Tipo</FieldLabel><div className={`grid ${v2Unlocked ? 'grid-cols-2' : 'grid-cols-1'} border border-[var(--n3-line)] bg-[#080d0d]`} aria-label="Tipo de propiedad"><button type="button" aria-pressed={subject.propertyType === 'Casa'} onClick={() => updateSubject('propertyType', 'Casa')} className={`${subject.propertyType === 'Casa' ? 'bg-[#d7332b] text-white' : 'text-[var(--n3-text-muted)]'} px-3 py-3 text-sm font-semibold`}>Casa</button>{v2Unlocked ? <button type="button" aria-pressed={subject.propertyType === 'Departamento'} onClick={() => updateSubject('propertyType', 'Departamento')} className={`${subject.propertyType === 'Departamento' ? 'bg-[#d7332b] text-white' : 'text-[var(--n3-text-muted)] hover:text-white'} border-l border-[var(--n3-line)] px-3 py-3 text-sm`}>Departamento</button> : null}</div></div>
        <TextField label="Dirección" value={subject.address} onChange={(value) => updateSubject('address', value)} placeholder="Calle y número" />
        <TextField label="Barrio / sector" value={subject.neighborhood} onChange={(value) => updateSubject('neighborhood', value)} placeholder="Barrio canónico" />
        <TextField label="ROL si existe" value={subject.rol} onChange={(value) => updateSubject('rol', value)} />
      </div></IntelligencePanel> : null}
    </section> : null}

    {step === 2 ? <section className="space-y-4">
      <IntelligencePanel eyebrow="Paso 2 · Estado actual" title="Estado actual" description="Confirma los datos y agrega cambios."><div className="p-5">
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
          </> : <>
            <NumberField label="M² construidos" value={subject.builtAreaM2} onChange={(value) => updateSubject('builtAreaM2', value)} suffix="m²" step={0.1} min={0} />
            <NumberField label="M² terreno" value={subject.landAreaM2} onChange={(value) => updateSubject('landAreaM2', value)} suffix="m²" step={0.1} min={0} />
          </>}
          <NumberField label="Dormitorios" value={subject.bedrooms} onChange={(value) => updateSubject('bedrooms', value)} min={0} />
          <NumberField label="Baños" value={subject.bathrooms} onChange={(value) => updateSubject('bathrooms', value)} min={0} />
          <NumberField label="Año construcción" value={subject.constructionYear} onChange={(value) => updateSubject('constructionYear', value)} min={1800} max={new Date().getFullYear()} />
        </div>
        <details className="mt-5 border border-[var(--n3-line)] bg-[#080d0d]">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-[var(--n3-text-muted)]">Agregar detalles opcionales</summary>
          <div className="grid gap-4 border-t border-[var(--n3-line)] p-4 md:grid-cols-2">
            <NumberField label="Estacionamientos" value={subject.parkingSpaces} onChange={(value) => updateSubject('parkingSpaces', value)} min={0} />
            {subject.propertyType === 'Departamento' ? <NumberField label="Piso" value={subject.floorNumber} onChange={(value) => updateSubject('floorNumber', value)} /> : <div />}
            <div className="md:col-span-2"><TextAreaField label="Estado y atributos" value={currentStateNotes} onChange={setCurrentStateNotes} placeholder="Ej.: remodelación, cocina integrada, bodega, quincho, orientación, vista o estado de conservación." /></div>
          </div>
        </details>
      </div></IntelligencePanel>
      <MethodologyNote>Los atributos quedan trazados. No alteran el valor automáticamente.</MethodologyNote>
    </section> : null}

    {step === 3 ? <section className="space-y-4">
      <IntelligencePanel eyebrow="Paso 3 · Mercado" title="Evidencia de mercado" description="Revisa ventas registradas y oferta observada. Selecciona los comparables que realmente representan esta propiedad."><div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><p className="text-sm font-semibold">{subject.address}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{subject.neighborhood} · {subject.propertyType}</p></div>
        <div className="flex flex-wrap gap-2">
          {recommendedComparableIds.length >= 3 && selectedComparables.length < 3 ? <button type="button" onClick={useRecommendedComparables} className="inline-flex items-center gap-2 border border-[#5f8f82]/60 bg-[#0a1210] px-4 py-2.5 text-xs font-semibold text-[#c8e0da]"><Check size={14} />Usar 3 recomendados</button> : null}
          <button type="button" disabled={suggesting} onClick={() => void suggestComparables()} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Sparkles size={14} />{suggesting ? 'Analizando…' : comparables.length ? 'Actualizar análisis' : 'Analizar mercado'}</button>
        </div>
      </div></IntelligencePanel>

      {(cbrsBenchmark || portalBenchmark) ? <MetricGrid>
        <MetricCard label="Ventas reales · CBRS" value={cbrsBenchmark ? cbrsBenchmark.transactions.toLocaleString('es-CL') : '—'} detail={cbrsBenchmark ? `Mediana del barrio ${benchmarkValue(cbrsBenchmark.median_uf_m2, ' UF/m²')}` : 'Sin referencia disponible'} />
        <MetricCard label="Oferta observada · Portal" value={portalBenchmark ? portalBenchmark.listing_count.toLocaleString('es-CL') : '—'} detail={portalBenchmark ? `Mediana publicada ${benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²')}` : 'Sin referencia disponible'} />
        <MetricCard label="Comparables elegidos" value={selectedComparables.length.toLocaleString('es-CL')} detail={selectedComparables.length >= 3 ? 'Muestra mínima completa.' : `Faltan ${Math.max(0, 3 - selectedComparables.length)} para completar la muestra mínima.`} />
        <MetricCard label="Estado de la muestra" value={quality.label} detail={quality.reason} />
      </MetricGrid> : null}

      {comparables.length ? <div className={`border px-4 py-3 text-sm ${selectedComparables.length >= 3 ? 'border-[#5f8f82]/50 bg-[#0a1210] text-[#c8e0da]' : 'border-[#c4ae70]/40 bg-[#17140c] text-[#e0c87f]'}`}>
        <strong>{selectedComparables.length >= 3 ? 'Muestra lista para decidir.' : 'Todavía falta evidencia seleccionada.'}</strong>
        <span className="ml-2 text-xs opacity-80">{selectedComparables.length >= 3 ? 'Puedes avanzar cuando hayas documentado por qué representa cada comparable.' : 'Elige al menos 3 comparables válidos antes de continuar.'}</span>
      </div> : null}

      {selectedComparables.length ? <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div><FieldLabel>Mediana seleccionada</FieldLabel><strong className="text-lg">{formatUfM2(summarizeEvidence(selectedComparables).medianUfM2)}</strong></div>
          <div><FieldLabel>Promedio por similitud</FieldLabel><strong className="text-lg">{formatUfM2(methodologySummary.weightedAverageUfM2)}</strong></div>
          <div><FieldLabel>Rango observado</FieldLabel><strong className="text-lg">{formatUfM2(summarizeEvidence(selectedComparables).minUfM2)} – {formatUfM2(summarizeEvidence(selectedComparables).maxUfM2)}</strong></div>
          <div><FieldLabel>Dispersión</FieldLabel><strong className="text-lg">{methodologySummary.dispersionPct == null ? '—' : `${methodologySummary.dispersionPct.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`}</strong></div>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--n3-text-muted)]">Referencia estadística. No define la tasa.</p>
      </div> : null}

      {selectedComparables.length ? <SecondOpinionPanel opinion={secondOpinion} /> : null}

      {!comparables.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-center"><p className="text-sm font-semibold">Sin comparables</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Analiza el mercado o agrega una referencia.</p></div> : null}

      <div className="space-y-3">{comparables.map((item, index) => {
        const suggested = item as SuggestedComparable
        const canonicalUfM2 = calculateCanonicalComparableUfM2(item)
        const referenceOnly = suggested.quality === 'reference_only'
        const sourceArea = item.propertyType === 'Casa' ? item.builtAreaM2 : (item.builtAreaM2 ?? item.usefulAreaM2)
        const manual = item.id.startsWith('cmp-')
        const isOutlier = methodologySummary.outlierIds.includes(item.id)
        const recommended = recommendedComparableIds.includes(item.id)
        return <div key={item.id} className={`border ${item.selected ? 'border-[#d7332b]' : recommended ? 'border-[#5f8f82]/60' : 'border-[var(--n3-line)]'} bg-[#0c1111]`}>
          <div className="flex flex-wrap items-center gap-4 p-4">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={referenceOnly} checked={referenceOnly ? false : item.selected} onChange={(event) => updateComparable(index, { selected: event.target.checked })} />{referenceOnly ? 'Solo referencia' : 'Usar como comparable'}{recommended && !referenceOnly ? <span className="border border-[#5f8f82]/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#9fd0c8]">Sugerido</span> : null}</label>
            <div className="min-w-[220px] flex-1"><p className="text-sm font-semibold">{item.address || 'Comparable sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.sourceType === 'CBRS' ? 'Venta registrada' : item.sourceType === 'Portal' || item.sourceType === 'TocToc' ? 'Oferta publicada' : item.sourceType} · {item.transactionDate || (suggested.observedAt ? `observado ${formatObservedAt(suggested.observedAt)}` : 'fecha no disponible')}</p></div>
            <div className="text-right"><p className="text-sm font-semibold">{item.priceUf > 0 ? `${item.priceUf.toLocaleString('es-CL')} UF` : 'Precio pendiente'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{canonicalUfM2 > 0 ? `${canonicalUfM2.toLocaleString('es-CL', { maximumFractionDigits: 6 })} UF/m²` : suggested.sourceReportedUfM2 ? `${suggested.sourceReportedUfM2.toLocaleString('es-CL')} UF/m² fuente` : 'UF/m² pendiente'}{sourceArea ? ` · ${sourceArea} m²` : ''}</p></div>
            <div className="text-right text-xs text-[var(--n3-text-muted)]">{item.distanceMeters !== undefined ? `${item.distanceMeters.toLocaleString('es-CL')} m` : 'distancia —'}<br />coincidencia {Math.round(item.similarityScore * 100)}%</div>
          </div>
          {isOutlier ? <div className="border-t border-[#c4ae70]/40 bg-[#17140c] px-4 py-3 text-xs text-[#e0c87f]">Revisar: este valor se aleja más de 25% de la mediana seleccionada.</div> : null}
          {referenceOnly ? <div className="border-t border-[var(--n3-line)] px-4 py-3 text-xs text-[#c4ae70]">Referencia sin superficie canónica completa.</div> : null}
          {item.selected ? <div className="border-t border-[var(--n3-line)] p-4"><TextField label="Por qué usar este comparable" value={item.adjustmentNotes} onChange={(value) => updateComparable(index, { adjustmentNotes: value })} placeholder="Ej.: venta reciente, misma zona, tamaño y programa similares." /></div> : null}
          <details className="border-t border-[var(--n3-line)]"><summary className="cursor-pointer px-4 py-3 text-xs text-[var(--n3-text-muted)]">{manual ? 'Completar' : 'Detalles'}</summary><div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
            <label className="block"><FieldLabel>Fuente</FieldLabel><select value={item.sourceType} onChange={(event) => updateComparable(index, { sourceType: event.target.value as ValuationComparable['sourceType'] })} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Portal</option><option>TocToc</option><option>CBRS</option><option>Cliente</option></select></label>
            <TextField label="Referencia / URL" value={item.sourceReference} onChange={(value) => updateComparable(index, { sourceReference: value })} />
            <TextField label="Dirección" value={item.address} onChange={(value) => updateComparable(index, { address: value })} />
            <TextField label="Barrio" value={item.neighborhood} onChange={(value) => updateComparable(index, { neighborhood: value })} />
            <NumberField label="Precio UF" value={item.priceUf > 0 ? item.priceUf : undefined} onChange={(value) => updateComparable(index, { priceUf: value ?? 0 })} suffix="UF" min={0} />
            {item.sourceType === 'CBRS' ? <DateField label="Fecha venta" value={item.transactionDate} onChange={(value) => updateComparable(index, { transactionDate: value })} /> : null}
            {item.propertyType === 'Departamento' && item.sourceType !== 'CBRS' ? <><NumberField label="M² útiles" value={item.usefulAreaM2} onChange={(value) => updateComparable(index, { usefulAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="M² totales" value={item.totalAreaM2} onChange={(value) => updateComparable(index, { totalAreaM2: value })} suffix="m²" step={0.1} min={0} /></> : null}
            {item.propertyType === 'Departamento' && item.sourceType === 'CBRS' ? <NumberField label="Superficie registrada CBRS" value={item.builtAreaM2} onChange={(value) => updateComparable(index, { builtAreaM2: value, usefulAreaM2: undefined, totalAreaM2: undefined })} suffix="m²" step={0.1} min={0} /> : null}
            {item.propertyType === 'Casa' ? <><NumberField label="M² construidos" value={item.builtAreaM2} onChange={(value) => updateComparable(index, { builtAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="M² terreno" value={item.landAreaM2} onChange={(value) => updateComparable(index, { landAreaM2: value })} suffix="m²" step={0.1} min={0} /></> : null}
            <button type="button" onClick={() => setComparables((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center justify-center gap-2 border border-[var(--n3-line)] px-3 py-3 text-xs hover:border-[#d7332b]"><Trash2 size={14} />Eliminar</button>
          </div></details>
        </div>
      })}</div>

      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => addComparable('CBRS')} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]"><Plus size={14} />Venta manual</button><button type="button" onClick={() => addComparable('Portal')} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]"><Plus size={14} />Oferta manual</button></div>
      {suggestionNotes.length ? <details className="border border-[var(--n3-line)] bg-[#0c1111]"><summary className="cursor-pointer px-4 py-3 text-xs text-[var(--n3-text-muted)]">Cómo se eligieron estas referencias</summary><div className="border-t border-[var(--n3-line)] p-4 text-xs leading-6 text-[var(--n3-text-muted)]">{suggestionNotes.join(' ')}</div></details> : null}
    </section> : null}

    {step === 4 ? <section className="space-y-4">
      <MetricGrid>
        <MetricCard label="Oferta seleccionada" value={portalEvidence.count.toLocaleString('es-CL')} detail={`Mediana ${formatUfM2(portalEvidence.medianUfM2)} · mercado ${portalBenchmark ? benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²') : '—'}`} />
        <MetricCard label="Ventas seleccionadas" value={cbrsEvidence.count.toLocaleString('es-CL')} detail={`Mediana ${formatUfM2(cbrsEvidence.medianUfM2)} · mercado ${cbrsBenchmark ? benchmarkValue(cbrsBenchmark.median_uf_m2, ' UF/m²') : '—'}`} />
        <MetricCard label="Método Property Partners" value="Aplicado" detail={subject.propertyType === 'Departamento' ? 'm² útiles + terraza ponderada × UF/m² confirmado' : 'construcción × tasa + terreno × tasa'} />
        <MetricCard label="Muestra confirmada" value={selectedComparables.length.toLocaleString('es-CL')} detail="Comparables elegidos y trazables." />
      </MetricGrid>

      <SecondOpinionPanel opinion={secondOpinion} />

      <IntelligencePanel eyebrow="Paso 4 · Decisión" title="Define el valor" description="La evidencia orienta la decisión. Property Partners confirma la tasa profesional final."><div className="p-5">
        {subject.propertyType === 'Departamento' ? <>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!cbrsEvidence.medianUfM2} onClick={() => adoptDepartmentRate('cbrs_median', cbrsEvidence.medianUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar mediana CBRS</button>
            <button type="button" disabled={!cbrsEvidence.averageUfM2} onClick={() => adoptDepartmentRate('cbrs_average', cbrsEvidence.averageUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar promedio CBRS</button>
            <button type="button" disabled={!portalEvidence.medianUfM2} onClick={() => adoptDepartmentRate('portal_median', portalEvidence.medianUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar mediana Portal</button>
            <button type="button" disabled={!portalEvidence.averageUfM2} onClick={() => adoptDepartmentRate('portal_average', portalEvidence.averageUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar promedio Portal</button>
          </div>
          <div className="mt-5 max-w-sm"><NumberField label="UF/m² adoptado" value={subject.usefulRateUfM2} onChange={(value) => { updateSubject('usefulRateUfM2', value); setRateAnchor(value === undefined ? null : 'manual') }} suffix="UF/m²" step={0.1} min={0} /></div>
          <p className="mt-3 text-xs text-[var(--n3-text-muted)]">Origen de la decisión: {rateAnchorLabel(rateAnchor)}.</p>
        </> : <div className="space-y-4">
          {houseRecommendation ? <div className="border border-[#5f8f82]/50 bg-[#0a1210] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <FieldLabel>Valor sugerido para trabajar</FieldLabel>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong className="text-3xl">{houseRecommendation.estimatedValueUf.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF</strong>
                  <span className="text-xs text-[var(--n3-text-muted)]">{houseRecommendation.weightedRateUfM2.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m² ponderado</span>
                </div>
                <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Calculado con {houseRecommendation.comparableCount} ventas compatibles · confianza {houseRecommendation.confidence === 'high' ? 'alta' : houseRecommendation.confidence === 'medium' ? 'media' : 'baja'}. Puedes usarlo o ajustarlo con criterio profesional.</p>
              </div>
              <button type="button" onClick={adoptHouseRecommendation} className="bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white">Usar este valor</button>
            </div>
          </div> : <div className="border border-[#c4ae70]/40 bg-[#17140c] px-4 py-3 text-sm text-[#e0c87f]">No hay una referencia automática suficientemente robusta. Revisa los comparables y define la tasa profesional.</div>}
          <details className="border border-[var(--n3-line)] bg-[#080d0d]" open={!houseRecommendation}>
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-[var(--n3-text-muted)]">Ajustar tasa manualmente</summary>
            <div className="grid gap-4 border-t border-[var(--n3-line)] p-4 md:grid-cols-2">
              <NumberField label="UF/m² construcción" value={subject.builtRateUfM2} onChange={(value) => { updateSubject('builtRateUfM2', value); setRateAnchor(value === undefined ? null : 'manual') }} suffix="UF/m²" step={0.1} min={0} />
              <NumberField label="UF/m² terreno" value={subject.landRateUfM2} onChange={(value) => { updateSubject('landRateUfM2', value); setRateAnchor(value === undefined ? null : 'manual') }} suffix="UF/m²" step={0.1} min={0} />
            </div>
          </details>
          <p className="text-xs text-[var(--n3-text-muted)]">Origen de la tasa: {rateAnchorLabel(rateAnchor)}.</p>
        </div>}
      </div></IntelligencePanel>

      <IntelligencePanel eyebrow="Valor para trabajar con el cliente" title={result ? `${result.adjustedValueUf.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF` : 'Pendiente de confirmar valor'} description={result ? `Valor estimado de la propiedad · ${result.commercialUfM2.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m² ponderado` : 'Confirma el valor sugerido o ajústalo para obtener la valorización y el precio de publicación.'}>{result ? <div className="grid gap-3 p-5 md:grid-cols-3">{result.publicationScenarios.map((scenario) => <div key={scenario.upliftPct} className={`border p-4 ${scenario.upliftPct === 5 ? 'border-[var(--n3-teal)] bg-[#0a1210]' : 'border-[var(--n3-line)]'}`}><FieldLabel>{scenario.upliftPct === 0 ? 'Valor estimado' : scenario.upliftPct === 5 ? 'Precio sugerido de publicación' : `Publicación · margen ${scenario.upliftPct}%`}</FieldLabel><strong className="text-xl">{scenario.suggestedPriceUf.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{scenario.suggestedUfM2.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m² ponderado{scenario.upliftPct === 5 ? ' · escenario estándar PP' : ''}</p></div>)}</div> : <div className="p-5 text-sm text-[var(--n3-text-muted)]">Pendiente de tasa.</div>}</IntelligencePanel>
    </section> : null}

    {step === 5 ? <section className="space-y-4">
      <IntelligencePanel eyebrow="Paso 5 · Tu valorización" title={result && selectedComparables.length >= 3 ? 'Valor listo para trabajar' : 'Revisión final'} description="Confirma el valor que usarás con el cliente y deja la evidencia lista para dirección."><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="border border-[var(--n3-line)] p-4 xl:col-span-2"><FieldLabel>Propiedad</FieldLabel><strong className="text-sm">{subject.address}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{subject.neighborhood} · {subject.propertyType} · ROL {subject.rol || 'no disponible'}</p></div>
        <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Evidencia</FieldLabel><strong className="text-xl">{selectedComparables.length}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{cbrsEvidence.count} ventas · {portalEvidence.count} ofertas</p></div>
        <div className="border border-[#d7332b] bg-[#130d0d] p-4"><FieldLabel>Valor sugerido</FieldLabel><strong className="text-2xl">{result ? `${result.adjustedValueUf.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF` : '—'}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{subject.propertyType === 'Departamento' ? rateAnchorLabel(rateAnchor) : rateAnchor === 'champion_v5' ? 'Referencia sugerida confirmada' : 'Tasa profesional ajustada por la ejecutiva'}</p></div>
      </div>
      {currentStateNotes.trim() ? <div className="border-t border-[var(--n3-line)] p-5"><FieldLabel>Estado actual declarado</FieldLabel><p className="text-sm leading-6 text-[var(--n3-text-muted)]">{currentStateNotes}</p></div> : null}
      </IntelligencePanel>
      <SecondOpinionPanel opinion={secondOpinion} />
      <IntelligencePanel eyebrow="Criterio profesional" title="Justificación del valorizador" description="Deja una explicación breve de la evidencia y la tasa elegida."><div className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--n3-text-muted)]">La evidencia genera un borrador; revísalo antes de enviarlo a dirección.</p>
          <button type="button" disabled={selectedComparables.length < 3} onClick={draftProfessionalJustification} className="border border-[var(--n3-line)] px-3 py-2 text-xs font-medium disabled:opacity-40 hover:border-[#d7332b]">Crear borrador con la evidencia</button>
        </div>
        <TextAreaField label="Justificación profesional" value={professionalJustification} onChange={setProfessionalJustification} placeholder="Ej.: se privilegian ventas recientes de superficie y ubicación comparables..." />
      </div></IntelligencePanel>
      <MethodologyNote>Oferta publicada y ventas registradas respaldan la decisión. Property Partners confirma el valor.</MethodologyNote>
    </section> : null}

    {message ? <div role="status" className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-sm text-[#ff9a93]">{message}</div> : null}

    <div className="sticky bottom-0 z-20 -mx-2 mt-2 border-t border-[var(--n3-line)] bg-[#050808]/95 px-2 py-3 backdrop-blur md:py-4">
      <div className="flex items-center justify-between gap-1.5 md:gap-3">
        <button type="button" disabled={step === 1} onClick={goBack} className="inline-flex min-h-11 items-center gap-1.5 border border-[var(--n3-line)] px-3 py-2.5 text-xs font-semibold disabled:opacity-30 md:gap-2 md:px-4"><ArrowLeft size={14} /><span className="hidden sm:inline">Anterior</span></button>
        <div className="hidden text-center text-xs text-[var(--n3-text-muted)] md:block">Paso {step} de 5 · {VALUATION_WIZARD_STEPS.find((item) => item.step === step)?.label}</div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {step > 1 && step < 5 ? <button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex min-h-11 items-center gap-1.5 border border-[var(--n3-line)] px-3 py-2.5 text-xs font-semibold disabled:opacity-50 md:gap-2 md:px-4"><Save size={14} /><span>{saving ? 'Guardando…' : <><span className="sm:hidden">Guardar</span><span className="hidden sm:inline">Guardar borrador</span></>}</span></button> : null}
          {step < 5 ? <button type="button" onClick={goNext} className="inline-flex min-h-11 items-center gap-1.5 bg-[#d7332b] px-3 py-2.5 text-xs font-semibold text-white md:gap-2 md:px-4"><span>Continuar</span><ArrowRight size={14} /></button> : <button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex min-h-11 items-center gap-2 bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50 md:px-5"><Save size={15} />{saving ? 'Guardando…' : 'Guardar valorización'}</button>}
        </div>
      </div>
    </div>
  </IntelligencePage>
}
