'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Calculator, CheckCircle2, Database, ShieldCheck } from 'lucide-react'
import valuationData from '@/data/valuation-intelligence.json'
import { calculateDeterministicValuation } from '@/lib/valuation-model'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'

type PropertyType = 'Casa' | 'Departamento'

type FormState = {
  propertyType: PropertyType
  address: string
  neighborhood: string
  rol: string
  usefulAreaM2: string
  terraceAreaM2: string
  appliedUsefulUfM2: string
  builtAreaM2: string
  landAreaM2: string
  builtUfM2: string
  landUfM2: string
}

const emptyForm: FormState = {
  propertyType: 'Departamento',
  address: '',
  neighborhood: '',
  rol: '',
  usefulAreaM2: '',
  terraceAreaM2: '',
  appliedUsefulUfM2: '',
  builtAreaM2: '',
  landAreaM2: '',
  builtUfM2: '',
  landUfM2: '',
}

const issueCopy: Record<string, { title: string; detail: string }> = {
  MISPLACED_RUT_VALUE: { title: 'Campo RUT inconsistente', detail: 'La celda destinada al RUT contiene una descripción de superficie útil. No se interpreta como identificador.' },
  EXPLICIT_DUPLICATE_INCLUDED_IN_FORMULAS: { title: 'Duplicado incluido en el promedio', detail: 'La plantilla declara que dos filas son el mismo departamento, pero ambas alimentan el promedio Excel.' },
  STALE_PORTAL_COMPARABLES: { title: 'Comparables Portal fuera del snapshot actual', detail: 'Ninguno de los seis enlaces históricos aparece en los 5.197 avisos válidos del snapshot suministrado.' },
  PARTIAL_CBRS_REPRODUCIBILITY: { title: 'Reproducibilidad CBRS parcial', detail: 'Solo dos de los seis comparables históricos se reproducen exactamente en la base CBRS entregada.' },
  HOUSE_TEMPLATE_HAS_NO_CASE_DATA: { title: 'Plantilla de casas sin caso poblado', detail: 'El libro define la metodología, pero no incluye una valorización de casa completa para validar resultados.' },
  SOURCE_VINTAGE_2020: { title: 'Metodología fuente de 2020', detail: 'Ambas plantillas fueron modificadas por última vez en 2020. Su vigencia debe revisarse antes de cambiar reglas.' },
}

function asNumber(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatUf(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} UF`
}

function InputField({ label, value, onChange, suffix, min = 0 }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; min?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span>
      <div className="flex border border-[var(--n3-line)] bg-[#080d0d] focus-within:border-[#d7332b]">
        <input type="number" min={min} step="0.1" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[var(--n3-text-light)] outline-none" />
        {suffix ? <span className="flex items-center border-l border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)]">{suffix}</span> : null}
      </div>
    </label>
  )
}

export default function ValorizadorPage() {
  const [form, setForm] = useState<FormState>(emptyForm)

  const result = useMemo(() => {
    if (form.propertyType === 'Casa') {
      const builtAreaM2 = asNumber(form.builtAreaM2)
      const builtUfM2 = asNumber(form.builtUfM2)
      const landAreaM2 = asNumber(form.landAreaM2)
      const landUfM2 = asNumber(form.landUfM2)
      if (builtAreaM2 <= 0 || builtUfM2 <= 0 || (landAreaM2 > 0 && landUfM2 <= 0)) return null
      return calculateDeterministicValuation({ propertyType: 'Casa', builtAreaM2, builtUfM2, landAreaM2, landUfM2 })
    }

    const usefulAreaM2 = asNumber(form.usefulAreaM2)
    const appliedUsefulUfM2 = asNumber(form.appliedUsefulUfM2)
    if (usefulAreaM2 <= 0 || appliedUsefulUfM2 <= 0) return null
    return calculateDeterministicValuation({ propertyType: 'Departamento', usefulAreaM2, terraceAreaM2: asNumber(form.terraceAreaM2), appliedUsefulUfM2 })
  }, [form])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function loadHistoricalCase() {
    const subject = valuationData.templateCase.subject
    const calculation = valuationData.templateCase.sourceCalculation
    setForm({ ...emptyForm, propertyType: 'Departamento', address: subject.address, neighborhood: subject.neighborhood, rol: subject.rol, usefulAreaM2: String(subject.usefulAreaM2), terraceAreaM2: String(subject.terraceAreaM2), appliedUsefulUfM2: String(calculation.appliedUfM2) })
  }

  const completedInputs = [form.address, form.neighborhood, form.rol].filter(Boolean).length
  const modelReady = Boolean(result)

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Valuation Intelligence · Modelo auditado"
        title="Workbench de Valorización"
        description="Una valorización transparente, reproducible y aprobable. Cada resultado conserva el método de la fuente, separa evidencia de supuestos y evita ajustes automáticos no respaldados."
        actions={[
          { label: 'Revisar mercado y fuentes', href: '/dashboard/market/fuentes', primary: true },
          { label: 'Inteligencia de mercado', href: '/dashboard/market' },
        ]}
        meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Motor de inteligencia N3uralia · cálculo determinístico</div>}
      />

      <section>
        <SectionHeading eyebrow="Valuation Pipeline" title="Estado del análisis" />
        <MetricGrid>
          <MetricCard label="Propiedad" value={`${completedInputs}/3`} detail="Dirección, barrio y ROL identificados." />
          <MetricCard label="Modelo" value={modelReady ? 'Listo' : 'Pendiente'} detail="Requiere superficies y UF/m² aplicado." />
          <MetricCard label="Fórmulas auditadas" value="122" detail="Sin errores de fórmula detectados en las plantillas." />
          <MetricCard label="Evidencia activa" value="2 fuentes" detail="Portal y CBRS, con límites visibles." />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="01 · Property" title="Definición de la propiedad" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <IntelligencePanel eyebrow="Inputs trazables" title="Datos base de la propiedad" description="Los datos ingresados permanecen separados de la evidencia de mercado y de cualquier recomendación comercial.">
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid min-w-[280px] flex-1 grid-cols-2 gap-px bg-[var(--n3-line)]">
                  {(['Departamento', 'Casa'] as PropertyType[]).map((type) => (
                    <button key={type} type="button" onClick={() => update('propertyType', type)} className={`px-4 py-3 text-sm font-semibold ${form.propertyType === type ? 'bg-[#d7332b] text-white' : 'bg-[#080d0d] text-[var(--n3-text-light)] hover:bg-[#121919]'}`}>{type}</button>
                  ))}
                </div>
                <button type="button" onClick={loadHistoricalCase} className="border border-[var(--n3-line)] px-3 py-2.5 text-xs font-semibold hover:border-[#d7332b]">Cargar caso histórico</button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  ['Dirección', 'address'], ['Barrio', 'neighborhood'], ['ROL', 'rol'],
                ].map(([label, key]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span>
                    <input value={form[key as keyof FormState]} onChange={(event) => update(key as keyof FormState, event.target.value)} className="w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-3 text-sm outline-none focus:border-[#d7332b]" />
                  </label>
                ))}
              </div>

              {form.propertyType === 'Departamento' ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <InputField label="M² útiles" value={form.usefulAreaM2} onChange={(value) => update('usefulAreaM2', value)} suffix="m²" />
                  <InputField label="M² terraza" value={form.terraceAreaM2} onChange={(value) => update('terraceAreaM2', value)} suffix="m²" />
                  <InputField label="UF/M² útil aplicado" value={form.appliedUsefulUfM2} onChange={(value) => update('appliedUsefulUfM2', value)} suffix="UF/m²" />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InputField label="M² construidos" value={form.builtAreaM2} onChange={(value) => update('builtAreaM2', value)} suffix="m²" />
                  <InputField label="UF/M² construcción" value={form.builtUfM2} onChange={(value) => update('builtUfM2', value)} suffix="UF/m²" />
                  <InputField label="M² terreno" value={form.landAreaM2} onChange={(value) => update('landAreaM2', value)} suffix="m²" />
                  <InputField label="UF/M² terreno" value={form.landUfM2} onChange={(value) => update('landUfM2', value)} suffix="UF/m²" />
                </div>
              )}

              <div className="mt-5"><MethodologyNote>El UF/m² debe ser definido por el responsable a partir de comparables revisados. El sistema no lo completa con promedios, IA ni factores adicionales.</MethodologyNote></div>
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="02 · Deterministic Engine" title="Resultado reproducible" description="El resultado aparece únicamente cuando existen inputs suficientes para ejecutar la fórmula fuente." critical>
            <div className="p-5">
              {result ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-px bg-[var(--n3-line)]">
                    <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Valor comercial</p><p className="mt-2 text-3xl font-semibold">{formatUf(result.commercialValueUf)}</p></div>
                    <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Área ponderada</p><p className="mt-2 text-3xl font-semibold">{result.effectiveAreaM2.toLocaleString('es-CL')} m²</p></div>
                  </div>
                  <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF/m² comercial ponderado</p><p className="mt-1 text-xl font-semibold text-[#ff766f]">{result.commercialWeightedUfM2.toLocaleString('es-CL')} UF/m²</p></div>
                  <div className="space-y-2">{result.componentValues.map((component) => <div key={component.label} className="flex justify-between border-b border-[var(--n3-line)] pb-2 text-sm"><span className="text-[var(--n3-text-muted)]">{component.label}</span><strong>{formatUf(component.valueUf)}</strong></div>)}</div>
                  <p className="text-xs leading-relaxed text-[var(--n3-text-muted)]">{result.method}</p>
                </div>
              ) : (
                <div className="border border-[var(--n3-line)] p-8 text-center"><Calculator className="mx-auto text-[var(--n3-text-muted)]" size={30} /><p className="mt-3 text-sm text-[var(--n3-text-muted)]">Completa superficies y UF/m² para ejecutar el cálculo.</p></div>
              )}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      {result ? (
        <section>
          <SectionHeading eyebrow="03 · Recommendation" title="Escenarios de publicación" />
          <MetricGrid columns={3}>
            {result.scenarios.map((scenario) => <MetricCard key={scenario.margin} label={`Margen ${(scenario.margin * 100).toFixed(0)}%`} value={formatUf(scenario.publicationUf)} detail={`${scenario.weightedUfM2.toLocaleString('es-CL')} UF/m² ponderado · Valor comercial / (1 - margen)`} />)}
          </MetricGrid>
        </section>
      ) : null}

      <section>
        <SectionHeading eyebrow="04 · Evidence" title="Contexto, confianza y límites" />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel eyebrow="Caso histórico" title="Reproducción de la plantilla" description="El caso histórico sirve para auditar la metodología, no para medir precisión actual.">
            <div className="p-5">
              <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
                <div className="bg-[#080d0d] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Valor comercial</p><strong className="mt-1 block">15.890 UF</strong></div>
                <div className="bg-[#080d0d] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Oferta histórica</p><strong className="mt-1 block">6 filas / 5 entidades</strong></div>
                <div className="bg-[#080d0d] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">CBRS reproducible</p><strong className="mt-1 block">2 de 6</strong></div>
              </div>
              <div className="mt-4 flex gap-3 text-sm"><Database size={18} className="mt-0.5 shrink-0 text-[#ff766f]" /><div><p>El ROL 413-293 aparece una vez en CBRS: 16.700 UF, 227 m² útiles, Las Nieves, octubre de 2024.</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">No es comparable temporalmente con una plantilla modificada en 2020.</p></div></div>
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Confidence Control" title="Control de evidencia" description="La confianza se expresa como cobertura y reproducibilidad, no como un score artificial.">
            <div className="space-y-2 p-5">
              {valuationData.qualityIssues.map((issue) => {
                const copy = issueCopy[issue.code]
                return <div key={issue.code} className="flex gap-3 border border-[var(--n3-line)] bg-[#080d0d] p-3"><AlertTriangle size={16} className={issue.severity === 'critical' ? 'mt-0.5 shrink-0 text-[var(--destructive)]' : 'mt-0.5 shrink-0 text-[#f39c12]'} /><div><p className="text-sm font-semibold">{copy?.title || issue.code}</p><p className="mt-1 text-xs leading-relaxed text-[var(--n3-text-muted)]">{copy?.detail || issue.detail}</p>{'sourceCell' in issue && issue.sourceCell ? <p className="mt-1 font-mono text-[10px] text-[var(--n3-text-muted)]">{issue.sourceCell}</p> : null}</div></div>
              })}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="05 · Governance" title="Aprobación por rol" />
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-3">
          {[
            ['Ejecutivo de venta', 'Completar ROL, superficies y comparables vigentes; proponer UF/m² con evidencia revisada.'],
            ['Director de venta', 'Aprobar comparables canónicos, resolver duplicados y validar el escenario de publicación.'],
            ['CEO', 'Monitorear vigencia metodológica, cobertura CBRS/Portal y error temporal de valorizaciones cerradas.'],
          ].map(([role, detail]) => <article key={role} className="bg-[#0c1111] p-5"><CheckCircle2 size={18} className="text-[#ff766f]" /><h3 className="mt-3 font-semibold">{role}</h3><p className="mt-2 text-xs leading-relaxed text-[var(--n3-text-muted)]">{detail}</p></article>)}
        </div>
      </section>

      <footer className="flex items-center gap-2 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)]"><ShieldCheck size={15} /> Powered by N3uralia Intelligence · metodología y fuentes visibles.</footer>
    </IntelligencePage>
  )
}
