'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Save, Trash2 } from 'lucide-react'
import {
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

const emptySubject: ValuationSubject = {
  propertyType: 'Departamento',
  address: '',
  neighborhood: '',
  homogeneousArea: '',
  rol: '',
  latitude: undefined,
  longitude: undefined,
  usefulAreaM2: 0,
  terraceAreaM2: 0,
  builtAreaM2: 0,
  landAreaM2: 0,
  bedrooms: 0,
  bathrooms: 0,
  parkingSpaces: 0,
  constructionYear: 0,
  floorNumber: 0,
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

const factorLabels: Array<[keyof QualitativeFactors, string]> = [
  ['condition', 'Estado de conservación'],
  ['remodeling', 'Remodelaciones'],
  ['orientation', 'Orientación'],
  ['floor', 'Piso'],
  ['light', 'Luminosidad'],
  ['view', 'Vista'],
  ['noise', 'Ruido'],
  ['commercialPotential', 'Potencial comercial'],
]

function blankComparable(index: number, type: ValuationSubject['propertyType']): ValuationComparable {
  return {
    id: `cmp-${Date.now()}-${index}`,
    sourceType: 'Portal',
    sourceReference: '',
    address: '',
    neighborhood: '',
    propertyType: type,
    transactionDate: undefined,
    distanceMeters: undefined,
    usefulAreaM2: undefined,
    builtAreaM2: undefined,
    landAreaM2: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    parkingSpaces: undefined,
    priceUf: 0,
    priceUfM2: 0,
    similarityScore: 0,
    selected: false,
    adjustmentPct: 0,
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

function validateCoordinates(subject: ValuationSubject) {
  const hasLatitude = subject.latitude !== undefined
  const hasLongitude = subject.longitude !== undefined
  if (hasLatitude !== hasLongitude) return 'Latitud y longitud deben informarse juntas.'
  if (subject.latitude !== undefined && (subject.latitude < -90 || subject.latitude > 90)) return 'La latitud debe estar entre -90 y 90.'
  if (subject.longitude !== undefined && (subject.longitude < -180 || subject.longitude > 180)) return 'La longitud debe estar entre -180 y 180.'
  return null
}

export default function ValuationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')
  const sourcePropertyId = searchParams.get('propertyId')
  const [subject, setSubject] = useState<ValuationSubject>(emptySubject)
  const [comparables, setComparables] = useState<ValuationComparable[]>([])
  const [factors, setFactors] = useState<QualitativeFactors>(emptyFactors)
  const [justification, setJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!assignmentId) return
    const rawType = searchParams.get('propertyType') || 'Departamento'
    const propertyType: ValuationSubject['propertyType'] = rawType.toLowerCase().includes('casa') ? 'Casa' : 'Departamento'
    setSubject((current) => ({
      ...current,
      propertyType,
      address: searchParams.get('address') || current.address,
      neighborhood: searchParams.get('neighborhood') || current.neighborhood,
      latitude: numberParam(searchParams.get('latitude')) ?? current.latitude,
      longitude: numberParam(searchParams.get('longitude')) ?? current.longitude,
      usefulAreaM2: numberParam(searchParams.get('usefulAreaM2')) ?? current.usefulAreaM2,
      builtAreaM2: numberParam(searchParams.get('builtAreaM2')) ?? current.builtAreaM2,
      bedrooms: numberParam(searchParams.get('bedrooms')) ?? current.bedrooms,
      bathrooms: numberParam(searchParams.get('bathrooms')) ?? current.bathrooms,
      parkingSpaces: numberParam(searchParams.get('parkingSpaces')) ?? current.parkingSpaces,
    }))
    setComparables((current) => current.map((item) => ({ ...item, propertyType })))
  }, [assignmentId, searchParams])

  const result = useMemo(() => {
    try { return calculateContractualValuation(subject, comparables, factors) } catch { return null }
  }, [subject, comparables, factors])

  const selectedComparables = comparables.filter((item) => item.selected && item.priceUfM2 > 0)

  function updateSubject<K extends keyof ValuationSubject>(key: K, value: ValuationSubject[K]) { setSubject((current) => ({ ...current, [key]: value })) }
  function updateComparable(index: number, patch: Partial<ValuationComparable>) { setComparables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function addComparable() { setComparables((current) => [...current, blankComparable(current.length + 1, subject.propertyType)]) }

  function validateDraft() {
    if (!subject.address.trim() || !subject.neighborhood.trim()) return 'Dirección y barrio son obligatorios.'
    const coordinateError = validateCoordinates(subject)
    if (coordinateError) return coordinateError
    if (!result) return 'Completa la superficie y al menos dos comparables seleccionados con UF/m² válido.'
    for (const [index, item] of selectedComparables.entries()) {
      if (!item.sourceReference.trim()) return `El comparable ${index + 1} requiere referencia de fuente.`
      if (!item.address.trim()) return `El comparable ${index + 1} requiere dirección.`
      if (item.similarityScore <= 0) return `El comparable ${index + 1} requiere una similitud respaldada mayor que cero.`
      if (item.adjustmentPct < -35 || item.adjustmentPct > 35) return `El ajuste del comparable ${index + 1} debe estar entre -35% y 35%.`
      if (item.distanceMeters !== undefined && item.distanceMeters < 0) return `La distancia del comparable ${index + 1} no puede ser negativa.`
      if (item.sourceType === 'CBRS' && !item.transactionDate) return `El comparable CBRS ${index + 1} requiere fecha de transacción.`
      if (item.transactionDate && item.transactionDate > new Date().toISOString().slice(0, 10)) return `La fecha del comparable ${index + 1} no puede estar en el futuro.`
    }
    return null
  }

  async function saveDraft() {
    const validationError = validateDraft()
    if (validationError) { setMessage(validationError); return }
    setSaving(true); setMessage(null)
    try {
      const response = await fetch('/api/valuation/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, comparables, qualitativeFactors: factors, justification, propertyAssignmentId: assignmentId, sourcePropertyId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible guardar la valorización.')
      if (!payload.caseId) throw new Error('La API no devolvió el identificador del caso.')
      router.push(`/dashboard/valuations/${payload.caseId}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible guardar la valorización.') }
    finally { setSaving(false) }
  }

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Módulo II · Valorización" title="Valorización contractual trazable" description="Ficha objetiva, comparables documentados, ajustes profesionales, revisión humana y registro versionado." actions={[{ label: 'Registro de valorizaciones', href: '/dashboard/valuations' }, { label: 'Inteligencia de mercado', href: '/dashboard/market' }]} meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Metodología valuation-contract-v1</div>} />

    {assignmentId ? <MethodologyNote>La API verificará la asignación activa, el perfil autenticado y la propiedad vinculada antes de persistir el expediente.</MethodologyNote> : null}

    <section><SectionHeading eyebrow="Estado" title="Cobertura del caso" /><MetricGrid>
      <MetricCard label="Propiedad" value={subject.address && subject.neighborhood ? 'Identificada' : 'Pendiente'} detail="Dirección, barrio, tipo y superficies." />
      <MetricCard label="Comparables activos" value={String(selectedComparables.length)} detail="El cálculo preliminar exige 2; la revisión exige 3 aceptados." />
      <MetricCard label="Valor preliminar" value={result ? `${Math.round(result.adjustedValueUf).toLocaleString('es-CL')} UF` : 'Pendiente'} detail="No es publicable hasta aprobación." />
      <MetricCard label="Estado inicial" value="Borrador" detail="La revisión se solicita desde el expediente." />
    </MetricGrid></section>

    <section><SectionHeading eyebrow="01 · Ficha" title="Propiedad" /><IntelligencePanel eyebrow="Sujeto" title="Identificación y características" description="Datos objetivos de la propiedad."><div className="grid gap-4 p-5 md:grid-cols-3">
      <label className="block"><FieldLabel>Tipo</FieldLabel><select value={subject.propertyType} onChange={(event) => updateSubject('propertyType', event.target.value as ValuationSubject['propertyType'])} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Departamento</option><option>Casa</option></select></label>
      <TextField label="Dirección" value={subject.address} onChange={(value) => updateSubject('address', value)} /><TextField label="Barrio" value={subject.neighborhood} onChange={(value) => updateSubject('neighborhood', value)} /><TextField label="Área homogénea" value={subject.homogeneousArea} onChange={(value) => updateSubject('homogeneousArea', value)} /><TextField label="ROL" value={subject.rol} onChange={(value) => updateSubject('rol', value)} />
      <NumberField label="Año construcción" value={subject.constructionYear} onChange={(value) => updateSubject('constructionYear', value)} min={1800} max={new Date().getFullYear()} /><NumberField label="Latitud" value={subject.latitude} onChange={(value) => updateSubject('latitude', value)} step={0.000001} min={-90} max={90} /><NumberField label="Longitud" value={subject.longitude} onChange={(value) => updateSubject('longitude', value)} step={0.000001} min={-180} max={180} /><NumberField label="Dormitorios" value={subject.bedrooms} onChange={(value) => updateSubject('bedrooms', value)} min={0} /><NumberField label="Baños" value={subject.bathrooms} onChange={(value) => updateSubject('bathrooms', value)} min={0} /><NumberField label="Estacionamientos" value={subject.parkingSpaces} onChange={(value) => updateSubject('parkingSpaces', value)} min={0} />
      {subject.propertyType === 'Departamento' ? <><NumberField label="Superficie útil" value={subject.usefulAreaM2} onChange={(value) => updateSubject('usefulAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="Terraza" value={subject.terraceAreaM2} onChange={(value) => updateSubject('terraceAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="Piso" value={subject.floorNumber} onChange={(value) => updateSubject('floorNumber', value)} min={-5} /></> : <><NumberField label="Superficie construida" value={subject.builtAreaM2} onChange={(value) => updateSubject('builtAreaM2', value)} suffix="m²" step={0.1} min={0} /><NumberField label="Terreno" value={subject.landAreaM2} onChange={(value) => updateSubject('landAreaM2', value)} suffix="m²" step={0.1} min={0} /></>}
    </div></IntelligencePanel></section>

    <section><div className="flex items-end justify-between gap-4"><SectionHeading eyebrow="02 · Comparables" title="Evidencia" /><button type="button" onClick={addComparable} className="mb-5 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold hover:border-[#d7332b]"><Plus size={14} />Agregar comparable</button></div>
      {!comparables.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-center text-sm text-[var(--n3-text-muted)]">No hay comparables. Agrégalos únicamente cuando exista evidencia verificable.</div> : null}
      <div className="space-y-4">{comparables.map((item, index) => <IntelligencePanel key={item.id} eyebrow={`Comparable ${index + 1}`} title={item.address || 'Sin dirección'} description="Fuente, precio, similitud y ajustes se guardan en el expediente."><div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
        <label className="block"><FieldLabel>Fuente</FieldLabel><select value={item.sourceType} onChange={(event) => updateComparable(index, { sourceType: event.target.value as ValuationComparable['sourceType'] })} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Portal</option><option>CBRS</option><option>Cliente</option></select></label><TextField label="Referencia fuente" value={item.sourceReference} onChange={(value) => updateComparable(index, { sourceReference: value })} /><DateField label="Fecha de transacción" value={item.transactionDate} onChange={(value) => updateComparable(index, { transactionDate: value })} /><NumberField label="Distancia al sujeto" value={item.distanceMeters} onChange={(value) => updateComparable(index, { distanceMeters: value })} suffix="m" min={0} />
        <label className="block"><FieldLabel>Tipo</FieldLabel><select value={item.propertyType} onChange={(event) => updateComparable(index, { propertyType: event.target.value as ValuationComparable['propertyType'] })} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Departamento</option><option>Casa</option></select></label><TextField label="Dirección" value={item.address} onChange={(value) => updateComparable(index, { address: value })} /><TextField label="Barrio" value={item.neighborhood} onChange={(value) => updateComparable(index, { neighborhood: value })} /><NumberField label="Precio" value={item.priceUf} onChange={(value) => updateComparable(index, { priceUf: value ?? 0 })} suffix="UF" min={0} /><NumberField label="Precio unitario" value={item.priceUfM2} onChange={(value) => updateComparable(index, { priceUfM2: value ?? 0 })} suffix="UF/m²" step={0.1} min={0} /><NumberField label="Ajuste" value={item.adjustmentPct} onChange={(value) => updateComparable(index, { adjustmentPct: value ?? 0 })} suffix="%" step={0.1} min={-35} max={35} />
      </div><div className="grid gap-3 border-t border-[var(--n3-line)] p-4 md:grid-cols-3 xl:grid-cols-6"><NumberField label="Superficie útil" value={item.usefulAreaM2} onChange={(value) => updateComparable(index, { usefulAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="Superficie construida" value={item.builtAreaM2} onChange={(value) => updateComparable(index, { builtAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="Terreno" value={item.landAreaM2} onChange={(value) => updateComparable(index, { landAreaM2: value })} suffix="m²" step={0.1} min={0} /><NumberField label="Dormitorios" value={item.bedrooms} onChange={(value) => updateComparable(index, { bedrooms: value })} min={0} /><NumberField label="Baños" value={item.bathrooms} onChange={(value) => updateComparable(index, { bathrooms: value })} min={0} /><NumberField label="Estacionamientos" value={item.parkingSpaces} onChange={(value) => updateComparable(index, { parkingSpaces: value })} min={0} /></div>
      <div className="flex flex-wrap items-center gap-5 border-t border-[var(--n3-line)] px-4 py-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={item.selected} onChange={(event) => updateComparable(index, { selected: event.target.checked })} />Seleccionado</label><label className="flex items-center gap-2">Similitud<input type="range" min="0" max="1" step="0.05" value={item.similarityScore} onChange={(event) => updateComparable(index, { similarityScore: Number(event.target.value) })} /><strong>{Math.round(item.similarityScore * 100)}%</strong></label><input placeholder="Nota del ajuste" value={item.adjustmentNotes ?? ''} onChange={(event) => updateComparable(index, { adjustmentNotes: event.target.value })} className="min-w-[280px] flex-1 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2" /><button type="button" onClick={() => setComparables((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 hover:border-[#d7332b]" aria-label={`Eliminar comparable ${index + 1}`}><Trash2 size={15} />Eliminar</button></div></IntelligencePanel>)}</div>
    </section>

    <section><SectionHeading eyebrow="03 · Ajustes" title="Criterio profesional" /><IntelligencePanel eyebrow="Ajustes" title="Factores documentados" description="Cada factor debe sustentarse con inspección o antecedentes verificables."><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{factorLabels.map(([key, label]) => <NumberField key={key} label={label} value={factors[key]} onChange={(value) => setFactors((current) => ({ ...current, [key]: value ?? 0 }))} suffix="%" step={0.5} min={-15} max={15} />)}</div><div className="border-t border-[var(--n3-line)] p-5"><TextField label="Justificación profesional" value={justification} onChange={setJustification} placeholder="Evidencia, supuestos y criterio aplicado." /></div></IntelligencePanel></section>

    <section><SectionHeading eyebrow="04 · Resultado" title="Cálculo preliminar" /><MetricGrid><MetricCard label="Base UF/m²" value={result ? result.baseUfM2.toLocaleString('es-CL') : 'Pendiente'} detail="Mediana ponderada." /><MetricCard label="Valor base" value={result ? `${Math.round(result.baseValueUf).toLocaleString('es-CL')} UF` : 'Pendiente'} detail="UF/m² por superficie efectiva." /><MetricCard label="Ajuste cualitativo" value={result ? `${result.qualitativeAdjustmentPct.toLocaleString('es-CL')}%` : 'Pendiente'} detail="Limitado entre -35% y 35%." /><MetricCard label="Rango preliminar" value={result ? `${Math.round(result.lowValueUf).toLocaleString('es-CL')}–${Math.round(result.highValueUf).toLocaleString('es-CL')} UF` : 'Pendiente'} detail="No publicable hasta aprobación." /></MetricGrid>{result ? <MethodologyNote>{result.justification}</MethodologyNote> : <MethodologyNote>El cálculo permanece pendiente hasta contar con superficie efectiva y al menos dos comparables seleccionados con UF/m² válido y similitud respaldada.</MethodologyNote>}</section>

    {message ? <div role="alert" className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">{message}</div> : null}
    <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex items-center gap-2 bg-[#d7332b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? 'Guardando…' : 'Guardar borrador trazable'}</button></div>
  </IntelligencePage>
}
