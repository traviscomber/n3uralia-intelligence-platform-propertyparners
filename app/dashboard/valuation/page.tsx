'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, FileDown, Plus, Save, Trash2 } from 'lucide-react'
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
  propertyType: 'Departamento', address: '', neighborhood: '', homogeneousArea: '', rol: '',
  usefulAreaM2: 0, terraceAreaM2: 0, builtAreaM2: 0, landAreaM2: 0,
  bedrooms: 0, bathrooms: 0, parkingSpaces: 0, constructionYear: 0, floorNumber: 0,
}

const emptyFactors: QualitativeFactors = {
  condition: 0, remodeling: 0, orientation: 0, floor: 0,
  light: 0, view: 0, noise: 0, commercialPotential: 0,
}

const factorLabels: Array<[keyof QualitativeFactors, string]> = [
  ['condition', 'Estado de conservación'], ['remodeling', 'Remodelaciones'],
  ['orientation', 'Orientación'], ['floor', 'Piso'], ['light', 'Luminosidad'],
  ['view', 'Vista'], ['noise', 'Ruido'], ['commercialPotential', 'Potencial comercial'],
]

function blankComparable(index: number, type: ValuationSubject['propertyType']): ValuationComparable {
  return { id: `cmp-${Date.now()}-${index}`, sourceType: 'Portal', sourceReference: '', address: '', neighborhood: '', propertyType: type, priceUf: 0, priceUfM2: 0, similarityScore: 0.7, selected: true, adjustmentPct: 0 }
}

function NumberField({ label, value, onChange, suffix, step = 1 }: { label: string; value?: number; onChange: (value: number) => void; suffix?: string; step?: number }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span><div className="flex border border-[var(--n3-line)] bg-[#080d0d] focus-within:border-[#d7332b]"><input type="number" step={step} value={value || ''} onChange={(event) => onChange(Number(event.target.value || 0))} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" />{suffix ? <span className="flex items-center border-l border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)]">{suffix}</span> : null}</div></label>
}

function TextField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span><input value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" /></label>
}

function numberParam(value: string | null) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function ValuationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')
  const sourcePropertyId = searchParams.get('propertyId')
  const [subject, setSubject] = useState<ValuationSubject>(emptySubject)
  const [comparables, setComparables] = useState<ValuationComparable[]>([
    blankComparable(1, 'Departamento'), blankComparable(2, 'Departamento'), blankComparable(3, 'Departamento'),
  ])
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
      usefulAreaM2: numberParam(searchParams.get('usefulAreaM2')),
      builtAreaM2: numberParam(searchParams.get('builtAreaM2')),
      bedrooms: numberParam(searchParams.get('bedrooms')),
      bathrooms: numberParam(searchParams.get('bathrooms')),
      parkingSpaces: numberParam(searchParams.get('parkingSpaces')),
    }))
    setComparables((current) => current.map((item) => ({ ...item, propertyType })))
  }, [assignmentId, searchParams])

  const result = useMemo(() => { try { return calculateContractualValuation(subject, comparables, factors) } catch { return null } }, [subject, comparables, factors])
  const selectedCount = comparables.filter((item) => item.selected && item.priceUfM2 > 0).length

  function updateSubject<K extends keyof ValuationSubject>(key: K, value: ValuationSubject[K]) { setSubject((current) => ({ ...current, [key]: value })) }
  function updateComparable(index: number, patch: Partial<ValuationComparable>) { setComparables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function addComparable() { setComparables((current) => [...current, blankComparable(current.length + 1, subject.propertyType)]) }

  async function saveDraft() {
    if (!result) { setMessage('Completa la propiedad y al menos dos comparables con UF/m² válido.'); return }
    setSaving(true); setMessage(null)
    try {
      const response = await fetch('/api/valuation/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          comparables,
          qualitativeFactors: factors,
          justification,
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

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Módulo II · Valorización" title="Valorización contractual trazable" description="Ficha completa, comparables documentados por el usuario, ajustes cualitativos, rango sugerido, aprobación humana y registro versionado." actions={[{ label: 'Registro de valorizaciones', href: '/dashboard/valuations' }, { label: 'Inteligencia de mercado', href: '/dashboard/market' }]} meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Metodología valuation-contract-v1</div>} />

    {assignmentId ? <MethodologyNote>Esta valorización se inició desde una propiedad asignada. La API verificará la asignación activa, la ejecutiva autenticada y el ID de propiedad antes de persistir la evidencia de origen.</MethodologyNote> : null}

    <section><SectionHeading eyebrow="Estado" title="Cobertura del caso" /><MetricGrid>
      <MetricCard label="Propiedad" value={subject.address && subject.neighborhood ? 'Completa' : 'Pendiente'} detail="Dirección, barrio, tipología y superficies." />
      <MetricCard label="Comparables activos" value={String(selectedCount)} detail="El borrador calcula desde 2; la revisión exige al menos 3 aceptados." />
      <MetricCard label="Valor sugerido" value={result ? `${Math.round(result.adjustedValueUf).toLocaleString('es-CL')} UF` : 'Pendiente'} detail="Calculado solo con evidencia suficiente." />
      <MetricCard label="Estado inicial" value="Borrador" detail="La revisión se solicita desde el expediente canónico." />
    </MetricGrid></section>

    <section><SectionHeading eyebrow="01 · Ficha" title="Variables objetivas de la propiedad" /><IntelligencePanel eyebrow="Sujeto" title="Identificación y características" description="Las variables se guardan separadas de los comparables y de los ajustes subjetivos."><div className="grid gap-4 p-5 md:grid-cols-3">
      <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Tipo</span><select value={subject.propertyType} onChange={(event) => updateSubject('propertyType', event.target.value as ValuationSubject['propertyType'])} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm"><option>Departamento</option><option>Casa</option></select></label>
      <TextField label="Dirección" value={subject.address} onChange={(value) => updateSubject('address', value)} /><TextField label="Barrio" value={subject.neighborhood} onChange={(value) => updateSubject('neighborhood', value)} /><TextField label="Área homogénea" value={subject.homogeneousArea} onChange={(value) => updateSubject('homogeneousArea', value)} /><TextField label="ROL" value={subject.rol} onChange={(value) => updateSubject('rol', value)} />
      <NumberField label="Año construcción" value={subject.constructionYear} onChange={(value) => updateSubject('constructionYear', value)} /><NumberField label="Dormitorios" value={subject.bedrooms} onChange={(value) => updateSubject('bedrooms', value)} /><NumberField label="Baños" value={subject.bathrooms} onChange={(value) => updateSubject('bathrooms', value)} /><NumberField label="Estacionamientos" value={subject.parkingSpaces} onChange={(value) => updateSubject('parkingSpaces', value)} />
      {subject.propertyType === 'Departamento' ? <><NumberField label="Superficie útil" value={subject.usefulAreaM2} onChange={(value) => updateSubject('usefulAreaM2', value)} suffix="m²" step={0.1} /><NumberField label="Terraza" value={subject.terraceAreaM2} onChange={(value) => updateSubject('terraceAreaM2', value)} suffix="m²" step={0.1} /><NumberField label="Piso" value={subject.floorNumber} onChange={(value) => updateSubject('floorNumber', value)} /></> : <><NumberField label="Superficie construida" value={subject.builtAreaM2} onChange={(value) => updateSubject('builtAreaM2', value)} suffix="m²" step={0.1} /><NumberField label="Terreno" value={subject.landAreaM2} onChange={(value) => updateSubject('landAreaM2', value)} suffix="m²" step={0.1} /></>}
    </div></IntelligencePanel></section>

    <section><div className="flex items-end justify-between gap-4"><SectionHeading eyebrow="02 · Comparables" title="Evidencia documentada y ajustes" /><button type="button" onClick={addComparable} className="mb-5 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold hover:border-[#d7332b]"><Plus size={14} />Agregar comparable</button></div><div className="space-y-3">
      {comparables.map((item, index) => <IntelligencePanel key={item.id} eyebrow={`Comparable ${index + 1}`} title={item.address || 'Sin dirección'} description="La fuente, referencia, precio, similitud y ajuste quedan documentados; la referencia no implica validación automática contra el origen."><div className="grid gap-3 p-4 md:grid-cols-4 xl:grid-cols-7">
        <select value={item.sourceType} onChange={(event) => updateComparable(index, { sourceType: event.target.value as ValuationComparable['sourceType'] })} className="border border-[var(--n3-line)] bg-[#080d0d] px-2 py-3 text-sm"><option>Portal</option><option>CBRS</option><option>Cliente</option></select><input placeholder="Referencia fuente" value={item.sourceReference} onChange={(event) => updateComparable(index, { sourceReference: event.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm" /><input placeholder="Dirección" value={item.address} onChange={(event) => updateComparable(index, { address: event.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm" /><input placeholder="Barrio" value={item.neighborhood} onChange={(event) => updateComparable(index, { neighborhood: event.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm" /><input type="number" placeholder="Precio UF" value={item.priceUf || ''} onChange={(event) => updateComparable(index, { priceUf: Number(event.target.value || 0) })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm" /><input type="number" step="0.1" placeholder="UF/m²" value={item.priceUfM2 || ''} onChange={(event) => updateComparable(index, { priceUfM2: Number(event.target.value || 0) })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm" /><div className="flex gap-2"><input type="number" step="0.1" title="Ajuste %" value={item.adjustmentPct || ''} onChange={(event) => updateComparable(index, { adjustmentPct: Number(event.target.value || 0) })} className="min-w-0 flex-1 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm" /><button type="button" onClick={() => setComparables((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="border border-[var(--n3-line)] px-3 hover:border-[#d7332b]" aria-label="Eliminar comparable"><Trash2 size={15} /></button></div>
      </div><div className="flex flex-wrap items-center gap-5 border-t border-[var(--n3-line)] px-4 py-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={item.selected} onChange={(event) => updateComparable(index, { selected: event.target.checked })} />Seleccionado</label><label className="flex items-center gap-2">Similitud<input type="range" min="0.1" max="1" step="0.05" value={item.similarityScore} onChange={(event) => updateComparable(index, { similarityScore: Number(event.target.value) })} /><strong>{Math.round(item.similarityScore * 100)}%</strong></label><input placeholder="Nota del ajuste" value={item.adjustmentNotes ?? ''} onChange={(event) => updateComparable(index, { adjustmentNotes: event.target.value })} className="min-w-[280px] flex-1 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2" /></div></IntelligencePanel>)}
    </div></section>

    <section><SectionHeading eyebrow="03 · Ajustes" title="Variables subjetivas configurables" /><IntelligencePanel eyebrow="Criterio profesional" title="Ajustes porcentuales" description="Cada factor debe justificarse mediante inspección, antecedentes o criterio profesional documentado."><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">{factorLabels.map(([key, label]) => <NumberField key={key} label={label} value={factors[key]} onChange={(value) => setFactors((current) => ({ ...current, [key]: value }))} suffix="%" step={0.5} />)}</div><div className="px-5 pb-5"><MethodologyNote>El ajuste cualitativo total se limita entre -35% y +35%. El caso se crea como borrador y debe pasar por revisión y aprobación humana.</MethodologyNote></div></IntelligencePanel></section>

    <section id="valuation-report"><SectionHeading eyebrow="04 · Resultado" title="Valor sugerido, rango y justificación" /><div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <IntelligencePanel eyebrow="Resultado" title={result ? `${Math.round(result.adjustedValueUf).toLocaleString('es-CL')} UF` : 'Pendiente de evidencia'} description="Resultado reproducible con comparables seleccionados y factores registrados." critical><div className="p-5">{result ? <div className="space-y-4"><MetricGrid columns={2}><MetricCard label="UF/m² base" value={result.baseUfM2.toLocaleString('es-CL')} detail="Mediana ponderada por similitud." /><MetricCard label="Valor base" value={`${Math.round(result.baseValueUf).toLocaleString('es-CL')} UF`} detail="Antes de ajustes cualitativos." /><MetricCard label="Ajuste total" value={`${result.qualitativeAdjustmentPct}%`} detail="Suma limitada de factores." /><MetricCard label="Rango" value={`${Math.round(result.lowValueUf).toLocaleString('es-CL')}–${Math.round(result.highValueUf).toLocaleString('es-CL')} UF`} detail="Banda operativa de ±5%." /></MetricGrid><div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} />Cálculo listo para guardar como borrador.</div></div> : <p className="text-sm text-[var(--n3-text-muted)]">Ingresa al menos dos comparables con UF/m² y una superficie efectiva válida.</p>}</div></IntelligencePanel>
      <IntelligencePanel eyebrow="Informe" title="Justificación profesional" description="El texto se incorpora al snapshot versionado y al informe exportable."><div className="p-5"><textarea value={justification} onChange={(event) => setJustification(event.target.value)} placeholder={result?.justification ?? 'Describe criterios, exclusiones, ajustes y limitaciones.'} className="min-h-40 w-full border border-[var(--n3-line)] bg-[#080d0d] p-4 text-sm outline-none focus:border-[#d7332b]" />{message ? <p className="mt-3 text-sm text-[#ff766f]">{message}</p> : null}<div className="mt-4 flex flex-wrap gap-3 print:hidden"><button disabled={saving} type="button" onClick={saveDraft} className="flex items-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />Guardar y abrir expediente</button><button type="button" onClick={() => window.print()} className="flex items-center gap-2 border border-[var(--n3-line)] px-4 py-3 text-sm font-semibold hover:border-[#d7332b]"><FileDown size={16} />Exportar / imprimir</button></div></div></IntelligencePanel>
    </div></section>
  </IntelligencePage>
}
