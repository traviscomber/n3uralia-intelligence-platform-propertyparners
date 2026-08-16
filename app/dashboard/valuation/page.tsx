'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import {
  calculateCanonicalComparableUfM2,
  calculateContractualValuation,
  type QualitativeFactors,
  type ValuationComparable,
  type ValuationSubject,
} from '@/lib/valuation-contract'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
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
  condition: 0, remodeling: 0, orientation: 0, floor: 0, light: 0, view: 0, noise: 0, commercialPotential: 0,
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

function blankComparable(index: number, type: ValuationSubject['propertyType'], sourceType: ValuationComparable['sourceType'] = 'Portal'): ValuationComparable {
  return {
    id: `cmp-${Date.now()}-${index}`, sourceType, sourceReference: '', address: '', neighborhood: '',
    propertyType: type, transactionDate: undefined, distanceMeters: undefined, totalAreaM2: undefined,
    usefulAreaM2: undefined, builtAreaM2: undefined, landAreaM2: undefined, priceUf: 0, priceUfM2: 0,
    similarityScore: 0, selected: false, adjustmentPct: 0,
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{children}</span>
}

function NumberField({ label, value, onChange, suffix, step = 1, min, max }: { label: string; value?: number; onChange: (value: number | undefined) => void; suffix?: string; step?: number; min?: number; max?: number }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><div className="flex border border-[var(--n3-line)] bg-[#080d0d] focus-within:border-[#d7332b]"><input type="number" step={step} min={min} max={max} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" />{suffix ? <span className="flex items-center border-l border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)]">{suffix}</span> : null}</div></label>
}

function TextField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><input value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
}

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><input type="date" value={value ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(event) => onChange(event.target.value || undefined)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
}

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function pct(value: number | null) {
  return value == null ? '—' : `${(value * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
}

function benchmarkValue(value: number | string | null | undefined, suffix = '') {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return '—'
  return `${parsed.toLocaleString('es-CL', { maximumFractionDigits: 1 })}${suffix}`
}

function formatUfM2(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} UF/m²`
}

function formatObservedAt(value: string | null) {
  if (!value) return 'fecha no disponible'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'fecha no disponible' : parsed.toLocaleDateString('es-CL')
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

function evidenceQuality(cbrs: EvidenceStats, portal: EvidenceStats) {
  const values = [cbrs, portal].flatMap((stats) => [stats.minUfM2, stats.maxUfM2]).filter((value): value is number => value != null && value > 0)
  const center = [cbrs.medianUfM2, portal.medianUfM2].filter((value): value is number => value != null && value > 0)
  const centerValue = center.length ? center.reduce((sum, value) => sum + value, 0) / center.length : 0
  const spread = values.length && centerValue > 0 ? (Math.max(...values) - Math.min(...values)) / centerValue : null

  if (cbrs.count >= 3 && portal.count >= 3 && (spread == null || spread <= 0.35)) {
    return { label: 'Alta', reason: `${cbrs.count} ventas CBRS + ${portal.count} ofertas seleccionadas${spread == null ? '' : ' · dispersión controlada'}` }
  }
  if (cbrs.count >= 2 || portal.count >= 2) {
    return { label: 'Media', reason: `${cbrs.count} ventas CBRS + ${portal.count} ofertas seleccionadas${spread != null && spread > 0.35 ? ' · dispersión alta' : ''}` }
  }
  return { label: 'Baja', reason: `${cbrs.count} ventas CBRS + ${portal.count} ofertas seleccionadas · muestra insuficiente` }
}

function rateAnchorLabel(anchor: RateAnchor) {
  const labels: Record<Exclude<RateAnchor, null>, string> = {
    cbrs_median: 'Mediana CBRS',
    cbrs_average: 'Promedio CBRS',
    portal_median: 'Mediana Portal',
    portal_average: 'Promedio Portal',
    manual: 'Valor manual',
  }
  return anchor ? labels[anchor] : 'Sin ancla confirmada'
}

export default function ValuationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')
  const sourcePropertyId = searchParams.get('propertyId')
  const quickLookup = searchParams.get('quickLookup') === '1'
  const autoAnalyze = searchParams.get('autoAnalyze') === '1'
  const autoAnalyzeKey = searchParams.get('eventKey') || searchParams.get('address') || ''
  const autoAnalyzeStarted = useRef<string | null>(null)
  const loadedQuickKey = useRef<string | null>(null)
  const [subject, setSubject] = useState<ValuationSubject>(emptySubject)
  const [comparables, setComparables] = useState<ValuationComparable[]>([])
  const [justification, setJustification] = useState('')
  const [rateAnchor, setRateAnchor] = useState<RateAnchor>(null)
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [cbrsBenchmark, setCbrsBenchmark] = useState<CbrsBenchmark | null>(null)
  const [portalBenchmark, setPortalBenchmark] = useState<PortalBenchmark | null>(null)
  const [suggestionNotes, setSuggestionNotes] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!assignmentId && !quickLookup) return
    const rawType = searchParams.get('propertyType') || 'Departamento'
    const propertyType: ValuationSubject['propertyType'] = rawType.toLowerCase().includes('casa') ? 'Casa' : 'Departamento'
    if (quickLookup && autoAnalyzeKey && loadedQuickKey.current !== autoAnalyzeKey) {
      loadedQuickKey.current = autoAnalyzeKey
      setComparables([])
      setCbrsBenchmark(null)
      setPortalBenchmark(null)
      setSuggestionNotes([])
      setRateAnchor(null)
    }
    setSubject((current) => ({
      ...current, propertyType,
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
  }, [assignmentId, quickLookup, autoAnalyzeKey, searchParams])

  const result = useMemo(() => {
    try { return calculateContractualValuation(subject, comparables, emptyFactors) } catch { return null }
  }, [subject, comparables])

  const selectedComparables = useMemo(
    () => comparables.filter((item) => item.selected && item.priceUf > 0 && calculateCanonicalComparableUfM2(item) > 0),
    [comparables],
  )
  const cbrsEvidence = useMemo(() => summarizeEvidence(selectedComparables.filter((item) => item.sourceType === 'CBRS')), [selectedComparables])
  const portalEvidence = useMemo(() => summarizeEvidence(selectedComparables.filter((item) => item.sourceType === 'Portal' || item.sourceType === 'TocToc')), [selectedComparables])
  const quality = useMemo(() => evidenceQuality(cbrsEvidence, portalEvidence), [cbrsEvidence, portalEvidence])

  function updateSubject<K extends keyof ValuationSubject>(key: K, value: ValuationSubject[K]) { setSubject((current) => ({ ...current, [key]: value })) }
  function updateComparable(index: number, patch: Partial<ValuationComparable>) { setComparables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function addComparable(sourceType: ValuationComparable['sourceType'] = 'Portal') { setComparables((current) => [...current, blankComparable(current.length + 1, subject.propertyType, sourceType)]) }
  function adoptDepartmentRate(anchor: Exclude<RateAnchor, 'manual' | null>, value: number | null) {
    if (!value || value <= 0) return
    updateSubject('usefulRateUfM2', Number(value.toFixed(2)))
    setRateAnchor(anchor)
  }

  async function suggestComparables() {
    if (!subject.neighborhood.trim()) { setMessage('Ingresa el barrio antes de sugerir comparables.'); return }
    setSuggesting(true); setMessage(null)
    try {
      const response = await fetch('/api/valuation/comparables/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: subject.propertyType,
          neighborhood: subject.neighborhood,
          address: subject.address,
          rol: subject.rol,
          eventKey: searchParams.get('eventKey') || undefined,
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
      if (!response.ok) throw new Error(payload.error || 'No fue posible sugerir comparables.')
      const existingRefs = new Set(comparables.map((item) => item.sourceReference).filter(Boolean))
      const fresh = payload.suggestions.filter((item) => !existingRefs.has(item.sourceReference)).map((item) => ({ ...item, selected: false }))
      setComparables((current) => [...current, ...fresh])
      setCbrsBenchmark(payload.cbrsBenchmark)
      setPortalBenchmark(payload.portalBenchmark)
      setSuggestionNotes(payload.notes || [])
      setMessage(fresh.length ? `${fresh.length} referencias/comparables propuestos. Las referencias Portal incompletas permanecen bloqueadas para selección.` : 'No encontramos comparables nuevos para este barrio y tipo.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible sugerir comparables.')
    } finally { setSuggesting(false) }
  }

  useEffect(() => {
    if (!autoAnalyze || !autoAnalyzeKey || !subject.neighborhood.trim()) return
    if (autoAnalyzeStarted.current === autoAnalyzeKey) return
    autoAnalyzeStarted.current = autoAnalyzeKey
    void suggestComparables()
  }, [autoAnalyze, autoAnalyzeKey, subject.neighborhood])

  function validateDraft() {
    if (!subject.address.trim() || !subject.neighborhood.trim()) return 'Dirección y barrio son obligatorios.'
    if ((subject.latitude === undefined) !== (subject.longitude === undefined)) return 'Latitud y longitud deben informarse juntas.'
    if (!result) return subject.propertyType === 'Departamento'
      ? 'Selecciona al menos dos comparables válidos y confirma el UF/m² útil de valorización.'
      : 'Selecciona al menos dos comparables válidos y completa las tasas de construcción/terreno aplicables.'
    for (const [index, item] of selectedComparables.entries()) {
      if (!item.sourceReference.trim()) return `El comparable ${index + 1} requiere referencia de fuente.`
      if (!item.address.trim()) return `El comparable ${index + 1} requiere dirección.`
      if (item.sourceType === 'CBRS' && !item.transactionDate) return `El comparable CBRS ${index + 1} requiere fecha de transacción.`
    }
    return null
  }

  async function saveDraft() {
    const validationError = validateDraft()
    if (validationError) { setMessage(validationError); return }
    setSaving(true); setMessage(null)
    try {
      const normalized = comparables.map((item) => ({
        ...item,
        usefulAreaM2: item.sourceType === 'CBRS' && item.propertyType === 'Departamento' ? undefined : item.usefulAreaM2,
        totalAreaM2: item.sourceType === 'CBRS' && item.propertyType === 'Departamento' ? undefined : item.totalAreaM2,
        priceUfM2: calculateCanonicalComparableUfM2(item),
      }))
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
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible guardar la valorización.')
      if (!payload.caseId) throw new Error('La API no devolvió el identificador del caso.')
      router.push(`/dashboard/valuations/${payload.caseId}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible guardar la valorización.') }
    finally { setSaving(false) }
  }

  const propertyState = subject.address && subject.neighborhood ? 'Identificada' : 'Completa dirección y barrio'
  const comparableState = selectedComparables.length
    ? `${selectedComparables.length} seleccionados`
    : comparables.length ? `${comparables.length} encontrados · 0 seleccionados` : (subject.neighborhood ? 'Listo para buscar comparables' : 'Completa el barrio')
  const decisionState = result
    ? `${Math.round(result.adjustedValueUf).toLocaleString('es-CL')} UF`
    : subject.propertyType === 'Departamento' && !subject.usefulRateUfM2 ? 'Selecciona UF/m² de valorización' : 'Evidencia insuficiente'

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Módulo II · Valorización" title="Valorizador Property Partners" description="Metodología canónica para casas y departamentos, contrastada con oferta Portal y ventas CBRS." actions={[{ label: 'Registro de valorizaciones', href: '/dashboard/valuations' }, { label: 'Inteligencia de mercado', href: '/dashboard/market' }]} meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">property-partners-valuation-v2</div>} />

    <MethodologyNote>Casas: valor comercial por m² construidos + terreno y UF/m² definidos por el valorizador; comparables ponderados con terreno/4. Departamentos: valor comercial por m² útiles × UF/m² útil; oferta pondera 50% de terraza. CBRS conserva la superficie registrada en la fuente canónica y no se etiqueta como “útil” cuando esa semántica no está confirmada. Las sugerencias automáticas nunca se seleccionan solas.</MethodologyNote>

    <QuickSubjectLookup />

    <section><SectionHeading eyebrow="Estado" title="Cobertura del caso" /><MetricGrid>
      <MetricCard label="Propiedad" value={propertyState} detail="Dirección, barrio, tipo y superficies." />
      <MetricCard label="Comparables" value={comparableState} detail="La selección es siempre humana." />
      <MetricCard label="Valor comercial" value={decisionState} detail="Se activa después de confirmar evidencia y tasa(s)." />
      <MetricCard label="Fuentes seleccionadas" value={`${portalEvidence.count} oferta · ${cbrsEvidence.count} ventas`} detail={`Calidad de evidencia: ${quality.label}.`} />
    </MetricGrid></section>

    <section><SectionHeading eyebrow="01 · Ficha" title="Propiedad a valorizar" /><IntelligencePanel eyebrow="Sujeto" title="Antecedentes básicos" description="Equivalente digital de la sección inicial de las plantillas canónicas."><div className="grid gap-4 p-5 md:grid-cols-3">
      <label className="block"><FieldLabel>Tipo</FieldLabel><select value={subject.propertyType} onChange={(event) => { const propertyType = event.target.value as ValuationSubject['propertyType']; updateSubject('propertyType', propertyType); setComparables([]); setCbrsBenchmark(null); setPortalBenchmark(null); setRateAnchor(null) }} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Departamento</option><option>Casa</option></select></label>
      <TextField label="Dirección" value={subject.address} onChange={(value) => updateSubject('address', value)} /><TextField label="Barrio / sector" value={subject.neighborhood} onChange={(value) => updateSubject('neighborhood', value)} /><TextField label="Área homogénea" value={subject.homogeneousArea} onChange={(value) => updateSubject('homogeneousArea', value)} /><TextField label="ROL" value={subject.rol} onChange={(value) => updateSubject('rol', value)} />
      <NumberField label="Año construcción" value={subject.constructionYear} onChange={(value) => updateSubject('constructionYear', value)} min={1800} max={new Date().getFullYear()} /><NumberField label="Latitud" value={subject.latitude} onChange={(value) => updateSubject('latitude', value)} step={0.000001} min={-90} max={90} /><NumberField label="Longitud" value={subject.longitude} onChange={(value) => updateSubject('longitude', value)} step={0.000001} min={-180} max={180} />
      {subject.propertyType === 'Departamento' ? <><NumberField label="M² útiles" value={subject.usefulAreaM2} onChange={(value) => updateSubject('usefulAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="M² terraza" value={subject.terraceAreaM2} onChange={(value) => updateSubject('terraceAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="UF/M² útil valorización" value={subject.usefulRateUfM2} onChange={(value) => { updateSubject('usefulRateUfM2', value); setRateAnchor(value === undefined ? null : 'manual') }} suffix="UF/m²" step={0.1} min={0} /><NumberField label="Piso" value={subject.floorNumber} onChange={(value) => updateSubject('floorNumber', value)} min={-5} /></> : <><NumberField label="M² construidos" value={subject.builtAreaM2} onChange={(value) => updateSubject('builtAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="UF/M² construido" value={subject.builtRateUfM2} onChange={(value) => updateSubject('builtRateUfM2', value)} suffix="UF/m²" step={0.1} min={0} /><NumberField label="M² terreno" value={subject.landAreaM2} onChange={(value) => updateSubject('landAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="UF/M² terreno" value={subject.landRateUfM2} onChange={(value) => updateSubject('landRateUfM2', value)} suffix="UF/m²" step={0.1} min={0} /></>}
      <NumberField label="Dormitorios" value={subject.bedrooms} onChange={(value) => updateSubject('bedrooms', value)} min={0} /><NumberField label="Baños" value={subject.bathrooms} onChange={(value) => updateSubject('bathrooms', value)} min={0} /><NumberField label="Estacionamientos" value={subject.parkingSpaces} onChange={(value) => updateSubject('parkingSpaces', value)} min={0} />
    </div></IntelligencePanel></section>

    <section><div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading eyebrow="02 · Comparables" title="Oferta y ventas reales" /><div className="mb-5 flex flex-wrap gap-2"><button type="button" disabled={suggesting} onClick={() => void suggestComparables()} className="flex items-center gap-2 bg-[#d7332b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Sparkles size={14} />{suggesting ? 'Buscando…' : 'Sugerir comparables'}</button><button type="button" onClick={() => addComparable('Portal')} className="flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold hover:border-[#d7332b]"><Plus size={14} />Oferta manual</button><button type="button" onClick={() => addComparable('CBRS')} className="flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold hover:border-[#d7332b]"><Plus size={14} />Venta CBRS</button></div></div>
      <div className="grid gap-4 xl:grid-cols-2">
        {portalBenchmark ? <IntelligencePanel eyebrow={`Benchmark Portal · ${portalBenchmark.scope === 'neighborhood' ? 'Barrio' : 'Global'}`} title={`${portalBenchmark.scope === 'neighborhood' ? subject.neighborhood : 'Vitacura'} · ${subject.propertyType}`} description={`Snapshot canónico de oferta observado ${formatObservedAt(portalBenchmark.observed_at)}. No equivale a venta efectiva.`}><div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4"><div><FieldLabel>Publicaciones</FieldLabel><strong>{portalBenchmark.listing_count.toLocaleString('es-CL')}</strong></div><div><FieldLabel>Mediana precio</FieldLabel><strong>{benchmarkValue(portalBenchmark.median_price_uf, ' UF')}</strong></div><div><FieldLabel>Mediana UF/m²</FieldLabel><strong>{benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²')}</strong></div><div><FieldLabel>Mediana superficie</FieldLabel><strong>{benchmarkValue(portalBenchmark.median_area_m2, ' m²')}</strong></div></div></IntelligencePanel> : null}
        {cbrsBenchmark ? <IntelligencePanel eyebrow="Benchmark CBRS" title={`${subject.neighborhood} · ${subject.propertyType}`} description="Ventas registradas canónicas; benchmark territorial, no reemplaza ventas individuales seleccionadas."><div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4"><div><FieldLabel>Transacciones</FieldLabel><strong>{cbrsBenchmark.transactions.toLocaleString('es-CL')}</strong></div><div><FieldLabel>Mediana precio</FieldLabel><strong>{benchmarkValue(cbrsBenchmark.median_price_uf, ' UF')}</strong></div><div><FieldLabel>Mediana UF/m²</FieldLabel><strong>{benchmarkValue(cbrsBenchmark.median_uf_m2, ' UF/m²')}</strong></div><div><FieldLabel>Mediana superficie</FieldLabel><strong>{benchmarkValue(cbrsBenchmark.median_area_m2, ' m²')}</strong></div></div></IntelligencePanel> : null}
      </div>
      {suggestionNotes.length ? <MethodologyNote>{suggestionNotes.join(' ')}</MethodologyNote> : null}
      {!comparables.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-center text-sm text-[var(--n3-text-muted)]">Usa “Sugerir comparables” o agrega evidencia manual. Las propuestas automáticas llegan desmarcadas para revisión.</div> : null}
      <div className="space-y-4">{comparables.map((item, index) => {
        const suggested = item as SuggestedComparable
        const canonicalUfM2 = calculateCanonicalComparableUfM2(item)
        const sourceArea = item.builtAreaM2 ?? item.usefulAreaM2
        const referenceOnly = suggested.quality === 'reference_only'
        const description = referenceOnly
          ? `Referencia Portal · UF/m² fuente ${suggested.sourceReportedUfM2 ? suggested.sourceReportedUfM2.toLocaleString('es-CL') : 'no disponible'} · no seleccionable hasta completar superficie canónica`
          : `UF/m² canónico: ${canonicalUfM2 > 0 ? canonicalUfM2.toLocaleString('es-CL') : 'pendiente'} · similitud ${Math.round(item.similarityScore * 100)}%`
        return <IntelligencePanel key={item.id} eyebrow={`${item.sourceType === 'CBRS' ? 'Venta' : referenceOnly ? 'Referencia oferta' : 'Oferta'} ${index + 1}`} title={item.address || 'Sin dirección'} description={description}><div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
          <label className="block"><FieldLabel>Fuente</FieldLabel><select disabled={referenceOnly} value={item.sourceType} onChange={(event) => updateComparable(index, { sourceType: event.target.value as ValuationComparable['sourceType'] })} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm disabled:opacity-60"><option>Portal</option><option>TocToc</option><option>CBRS</option><option>Cliente</option></select></label>
          <TextField label="Referencia / URL" value={item.sourceReference} onChange={(value) => updateComparable(index, { sourceReference: value })} /><DateField label="Fecha venta" value={item.transactionDate} onChange={(value) => updateComparable(index, { transactionDate: value })} /><TextField label="Dirección" value={item.address} onChange={(value) => updateComparable(index, { address: value })} /><TextField label="Barrio" value={item.neighborhood} onChange={(value) => updateComparable(index, { neighborhood: value })} /><NumberField label={item.sourceType === 'CBRS' ? 'Precio venta' : 'Precio publicado'} value={item.priceUf > 0 ? item.priceUf : undefined} onChange={(value) => updateComparable(index, { priceUf: value ?? 0 })} suffix="UF" min={0} />
          {item.propertyType === 'Departamento' ? item.sourceType === 'CBRS'
            ? <NumberField label="Superficie registrada CBRS" value={sourceArea} onChange={(value) => updateComparable(index, { builtAreaM2: value, usefulAreaM2: undefined, totalAreaM2: undefined })} suffix="m²" step={0.1} min={0} />
            : <><NumberField label="M² totales" value={item.totalAreaM2} onChange={(value) => updateComparable(index, { totalAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="M² útiles" value={item.usefulAreaM2} onChange={(value) => updateComparable(index, { usefulAreaM2: value })} suffix="m²" step={0.1} min={0} /></>
            : <><NumberField label="M² construidos" value={item.builtAreaM2} onChange={(value) => updateComparable(index, { builtAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="M² terreno" value={item.landAreaM2} onChange={(value) => updateComparable(index, { landAreaM2: value })} suffix="m²" step={0.1} min={0} /></>}
          <NumberField label="Distancia" value={item.distanceMeters} onChange={(value) => updateComparable(index, { distanceMeters: value })} suffix="m" min={0} /><div className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3"><FieldLabel>{referenceOnly ? 'UF/M² reportado fuente' : 'UF/M² calculado'}</FieldLabel><strong className="text-sm">{referenceOnly ? (suggested.sourceReportedUfM2?.toLocaleString('es-CL') ?? '—') : canonicalUfM2 > 0 ? canonicalUfM2.toLocaleString('es-CL') : '—'}</strong></div>
        </div><div className="flex flex-wrap items-center gap-4 border-t border-[var(--n3-line)] px-4 py-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" disabled={referenceOnly} checked={referenceOnly ? false : item.selected} onChange={(event) => updateComparable(index, { selected: event.target.checked })} />{referenceOnly ? 'Referencia solamente · no seleccionable' : 'Usar en análisis'}</label><input placeholder="Observación / criterio de selección" value={item.adjustmentNotes ?? ''} onChange={(event) => updateComparable(index, { adjustmentNotes: event.target.value })} className="min-w-[280px] flex-1 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2" /><button type="button" onClick={() => setComparables((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 hover:border-[#d7332b]"><Trash2 size={15} />Eliminar</button></div></IntelligencePanel>
      })}</div>
    </section>

    <section><SectionHeading eyebrow="03 · Decisión" title="Evidencia para decisión" /><IntelligencePanel eyebrow="Tres pilares" title="Oferta · Ventas · Método Property Partners" description="Las fuentes se mantienen separadas. La evidencia orienta; la tasa final la confirma el valorizador."><div className="grid gap-4 p-5 md:grid-cols-3">
      <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Pilar 1 · Oferta Portal</FieldLabel><p className="text-2xl font-semibold">{portalEvidence.count}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Seleccionadas: mediana {formatUfM2(portalEvidence.medianUfM2)} · promedio {formatUfM2(portalEvidence.averageUfM2)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Benchmark canónico: {portalBenchmark ? benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²') : '—'}</p></div>
      <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Pilar 2 · Ventas CBRS</FieldLabel><p className="text-2xl font-semibold">{cbrsEvidence.count}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Mediana {formatUfM2(cbrsEvidence.medianUfM2)} · Promedio {formatUfM2(cbrsEvidence.averageUfM2)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Rango {formatUfM2(cbrsEvidence.minUfM2)} — {formatUfM2(cbrsEvidence.maxUfM2)}</p></div>
      <div className="border border-[var(--n3-line)] p-4"><FieldLabel>Pilar 3 · Método Property Partners</FieldLabel><p className="text-2xl font-semibold">{quality.label}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{quality.reason}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{subject.propertyType === 'Departamento' ? 'Valor comercial = m² útiles × UF/m² útil confirmado.' : 'Valor comercial = construcción × tasa + terreno × tasa.'}</p></div>
    </div>
    {subject.propertyType === 'Departamento' ? <div className="border-t border-[var(--n3-line)] p-5"><FieldLabel>Anclas sugeridas de UF/m²</FieldLabel><div className="flex flex-wrap gap-2">
      <button type="button" disabled={!cbrsEvidence.medianUfM2} onClick={() => adoptDepartmentRate('cbrs_median', cbrsEvidence.medianUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar mediana CBRS</button>
      <button type="button" disabled={!cbrsEvidence.averageUfM2} onClick={() => adoptDepartmentRate('cbrs_average', cbrsEvidence.averageUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar promedio CBRS</button>
      <button type="button" disabled={!portalEvidence.medianUfM2} onClick={() => adoptDepartmentRate('portal_median', portalEvidence.medianUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar mediana Portal seleccionada</button>
      <button type="button" disabled={!portalEvidence.averageUfM2} onClick={() => adoptDepartmentRate('portal_average', portalEvidence.averageUfM2)} className="border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-40 hover:border-[#d7332b]">Usar promedio Portal seleccionado</button>
    </div><p className="mt-3 text-xs text-[var(--n3-text-muted)]">Valor actual: {subject.usefulRateUfM2 ? `${subject.usefulRateUfM2.toLocaleString('es-CL')} UF/m²` : 'sin confirmar'} · Origen: {rateAnchorLabel(rateAnchor)}. El benchmark Portal se muestra como contraste, pero no rellena automáticamente la tasa porque no equivale a una selección de comparables.</p></div> : <div className="border-t border-[var(--n3-line)] p-5 text-xs text-[var(--n3-text-muted)]">En casas la evidencia no reemplaza las dos tasas profesionales. Construcción y terreno permanecen como decisiones separadas.</div>}
    </IntelligencePanel></section>

    <section><SectionHeading eyebrow="04 · Resultado" title="Valor comercial y contraste" /><MetricGrid>
      <MetricCard label="Valor comercial" value={result ? `${Math.round(result.adjustedValueUf).toLocaleString('es-CL')} UF` : 'Pendiente'} detail="Calculado según plantilla canónica." />
      <MetricCard label="UF/M² comercial" value={result ? result.commercialUfM2.toLocaleString('es-CL') : 'Pendiente'} detail={subject.propertyType === 'Casa' ? 'Sobre construido + terreno/4.' : `Tasa confirmada · ${rateAnchorLabel(rateAnchor)}`} />
      <MetricCard label="CBRS mediana" value={cbrsEvidence.medianUfM2 ? formatUfM2(cbrsEvidence.medianUfM2) : 'Sin muestra'} detail={result ? `Variación valor vs promedio CBRS: ${pct(result.salePriceVarianceVsCbrsAveragePct)}` : 'Ventas seleccionadas.'} />
      <MetricCard label="Portal benchmark" value={portalBenchmark ? benchmarkValue(portalBenchmark.median_uf_m2, ' UF/m²') : 'Sin benchmark'} detail={portalBenchmark ? `${portalBenchmark.scope === 'neighborhood' ? subject.neighborhood : 'Vitacura'} · ${formatObservedAt(portalBenchmark.observed_at)}` : 'Oferta canónica de referencia.'} />
    </MetricGrid>
    {result ? <div className="mt-5 grid gap-4 md:grid-cols-3">{result.publicationScenarios.map((scenario) => <IntelligencePanel key={scenario.upliftPct} eyebrow={`Precio publicación · ${scenario.upliftPct}%`} title={`${Math.round(scenario.suggestedPriceUf).toLocaleString('es-CL')} UF`} description={`${scenario.suggestedUfM2.toLocaleString('es-CL')} UF/m² ponderado`}><div className="grid grid-cols-2 gap-3 p-4 text-xs"><div><span className="text-[var(--n3-text-muted)]">vs oferta máxima</span><strong className="mt-1 block">{pct(scenario.varianceVsOfferMaxPct)}</strong></div><div><span className="text-[var(--n3-text-muted)]">vs oferta promedio</span><strong className="mt-1 block">{pct(scenario.varianceVsOfferAveragePct)}</strong></div><div><span className="text-[var(--n3-text-muted)]">UF/m² vs máximo</span><strong className="mt-1 block">{pct(scenario.varianceUfM2VsOfferMaxPct)}</strong></div><div><span className="text-[var(--n3-text-muted)]">UF/m² vs promedio</span><strong className="mt-1 block">{pct(scenario.varianceUfM2VsOfferAveragePct)}</strong></div></div></IntelligencePanel>)}</div> : null}
    {result ? <MethodologyNote>{result.justification}{result.warnings.length ? ` Advertencias: ${result.warnings.join(' ')}` : ''}</MethodologyNote> : <MethodologyNote>Selecciona evidencia y confirma la tasa de valorización. El sistema no decide automáticamente el UF/m² final.</MethodologyNote>}</section>

    <section><SectionHeading eyebrow="05 · Revisión" title="Criterio profesional" /><IntelligencePanel eyebrow="Observaciones" title="Justificación del valorizador" description="La revisión humana queda documentada, pero no altera el valor automáticamente."><div className="p-5"><TextField label="Justificación profesional" value={justification} onChange={setJustification} placeholder="Criterio, evidencia, estado de conservación, remodelaciones, orientación, vista u otras observaciones relevantes." /></div></IntelligencePanel></section>

    {message ? <div role="alert" className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">{message}</div> : null}
    <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex items-center gap-2 bg-[#d7332b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? 'Guardando…' : 'Guardar valorización trazable'}</button></div>
  </IntelligencePage>
}