'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Calculator, Database, ShieldCheck } from 'lucide-react'
import valuationData from '@/data/valuation-intelligence.json'
import { calculateDeterministicValuation } from '@/lib/valuation-model'

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
  MISPLACED_RUT_VALUE: {
    title: 'Campo RUT inconsistente',
    detail: 'La celda destinada al RUT contiene una descripción de superficie útil. No se interpreta como identificador.',
  },
  EXPLICIT_DUPLICATE_INCLUDED_IN_FORMULAS: {
    title: 'Duplicado incluido en el promedio',
    detail: 'La plantilla declara que dos filas son el mismo departamento, pero ambas alimentan el promedio Excel.',
  },
  STALE_PORTAL_COMPARABLES: {
    title: 'Comparables Portal fuera del snapshot actual',
    detail: 'Ninguno de los seis enlaces históricos aparece en los 5.197 avisos válidos del snapshot suministrado.',
  },
  PARTIAL_CBRS_REPRODUCIBILITY: {
    title: 'Reproducibilidad CBRS parcial',
    detail: 'Solo dos de los seis comparables históricos se reproducen exactamente en la base CBRS entregada.',
  },
  HOUSE_TEMPLATE_HAS_NO_CASE_DATA: {
    title: 'Plantilla de casas sin caso poblado',
    detail: 'El libro define la metodología, pero no incluye una valorización de casa completa para validar resultados.',
  },
  SOURCE_VINTAGE_2020: {
    title: 'Metodología fuente de 2020',
    detail: 'Ambas plantillas fueron modificadas por última vez en 2020. Su vigencia debe revisarse antes de cambiar reglas.',
  },
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
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</span>
      <div className="flex border border-[var(--n3-line)] bg-[var(--n3-deep)] focus-within:border-[#d7332b]">
        <input type="number" min={min} step="0.1" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--n3-text-light)] outline-none" />
        {suffix ? <span className="flex items-center border-l border-[var(--n3-line)] bg-[var(--n3-black)] px-3 text-xs text-[var(--n3-text-muted)]">{suffix}</span> : null}
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
    return calculateDeterministicValuation({
      propertyType: 'Departamento',
      usefulAreaM2,
      terraceAreaM2: asNumber(form.terraceAreaM2),
      appliedUsefulUfM2,
    })
  }, [form])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function loadHistoricalCase() {
    const subject = valuationData.templateCase.subject
    const calculation = valuationData.templateCase.sourceCalculation
    setForm({
      ...emptyForm,
      propertyType: 'Departamento',
      address: subject.address,
      neighborhood: subject.neighborhood,
      rol: subject.rol,
      usefulAreaM2: String(subject.usefulAreaM2),
      terraceAreaM2: String(subject.terraceAreaM2),
      appliedUsefulUfM2: String(calculation.appliedUfM2),
    })
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--n3-teal)]">Property Partners Vitacura</p>
            <h1 className="mt-2 text-3xl font-semibold">Valorización de propiedades</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Cálculo determinístico basado en las dos plantillas fuente. Sin ajustes automáticos por edad, piso, dormitorios o equipamiento.</p>
          </div>
          <Link href="/dashboard/market/fuentes" className="border border-[#d7332b] px-4 py-2 text-xs font-semibold hover:bg-[#d7332b]">Revisar Portal, KML y CBRS</Link>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="grid gap-px bg-[var(--n3-line)] md:grid-cols-4">
        <div className="bg-[var(--n3-deep)] p-4 text-[var(--n3-text-light)]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Plantillas</p><p className="mt-2 text-2xl font-semibold">2</p><p className="text-xs text-[var(--n3-text-muted)]">Casas y departamentos</p></div>
        <div className="bg-[var(--n3-deep)] p-4 text-[var(--n3-text-light)]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Fórmulas auditadas</p><p className="mt-2 text-2xl font-semibold">122</p><p className="text-xs text-[var(--n3-text-muted)]">0 errores Excel</p></div>
        <div className="bg-[var(--n3-deep)] p-4 text-[var(--n3-text-light)]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Publicaciones sin señal de arriendo</p><p className="mt-2 text-2xl font-semibold">5.190</p><p className="text-xs text-[var(--n3-text-muted)]">7 avisos con señal explícita de arriendo excluidos</p></div>
        <div className="bg-[var(--n3-deep)] p-4 text-[var(--n3-text-light)]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Activos registrales CBRS</p><p className="mt-2 text-2xl font-semibold">40.843</p><p className="text-xs text-[var(--n3-text-muted)]">34.755 eventos; incluye activos no residenciales</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 text-[var(--n3-text-light)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">01 · Inputs trazables</p><h2 className="mt-1 text-xl font-semibold">Datos de la propiedad</h2></div>
            <button type="button" onClick={loadHistoricalCase} className="border border-black px-3 py-2 text-xs font-semibold hover:bg-black hover:text-white">Cargar caso histórico</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-px bg-[var(--n3-line)]">
            {(['Departamento', 'Casa'] as PropertyType[]).map((type) => (
              <button key={type} type="button" onClick={() => update('propertyType', type)} className={`px-4 py-3 text-sm font-semibold ${form.propertyType === type ? 'bg-black text-white' : 'bg-[var(--n3-deep)] text-[var(--n3-text-light)] hover:bg-[var(--n3-line)]'}`}>{type}</button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Dirección</span><input value={form.address} onChange={(event) => update('address', event.target.value)} className="w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2.5 text-sm outline-none focus:border-[#d7332b]" /></label>
            <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Barrio</span><input value={form.neighborhood} onChange={(event) => update('neighborhood', event.target.value)} className="w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2.5 text-sm outline-none focus:border-[#d7332b]" /></label>
            <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">ROL</span><input value={form.rol} onChange={(event) => update('rol', event.target.value)} className="w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2.5 text-sm outline-none focus:border-[#d7332b]" /></label>
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

          <div className="mt-5 border-l-4 border-[#f39c12] bg-[var(--n3-black)] p-3 text-xs leading-relaxed text-[var(--warning)]">
            El UF/m² debe ser definido por el responsable a partir de comparables revisados. El sistema no lo completa con promedios, IA ni factores adicionales.
          </div>
        </div>

        <div className="border border-[var(--n3-text-light)] bg-black p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">02 · Cálculo fuente</p>
          <h2 className="mt-1 text-xl font-semibold">Resultado determinístico</h2>
          {result ? (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-px bg-[var(--n3-text-light)]">
                <div className="bg-[var(--n3-text-light)] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Valor comercial</p><p className="mt-2 text-2xl font-semibold">{formatUf(result.commercialValueUf)}</p></div>
                <div className="bg-[var(--n3-text-light)] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Área ponderada</p><p className="mt-2 text-2xl font-semibold">{result.effectiveAreaM2.toLocaleString('es-CL')} m²</p></div>
              </div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF/m² comercial ponderado</p><p className="mt-1 text-xl font-semibold text-[var(--n3-teal-soft)]">{result.commercialWeightedUfM2.toLocaleString('es-CL')} UF/m²</p></div>
              <div className="space-y-2">{result.componentValues.map((component) => <div key={component.label} className="flex justify-between border-b border-[var(--n3-text-light)] pb-2 text-sm"><span className="text-[var(--n3-text-muted)]">{component.label}</span><strong>{formatUf(component.valueUf)}</strong></div>)}</div>
              <p className="text-xs leading-relaxed text-[var(--n3-text-muted)]">{result.method}</p>
            </div>
          ) : (
            <div className="mt-5 border border-[var(--n3-text-light)] p-6 text-center"><Calculator className="mx-auto text-[var(--n3-text-muted)]" size={28} /><p className="mt-3 text-sm text-[var(--n3-text-muted)]">Completa superficies y UF/m² para obtener un cálculo.</p></div>
          )}
        </div>
      </section>

      {result ? (
        <section>
          <div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">03 · Estrategia de publicación</p><h2 className="mt-1 text-xl font-semibold text-white">Escenarios exactos de plantilla</h2></div>
          <div className="grid gap-px bg-[var(--n3-text-light)] md:grid-cols-3">
            {result.scenarios.map((scenario) => (
              <div key={scenario.margin} className="bg-[var(--n3-deep)] p-5 text-[var(--n3-text-light)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Margen {(scenario.margin * 100).toFixed(0)}%</p>
                <p className="mt-2 text-2xl font-semibold">{formatUf(scenario.publicationUf)}</p>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{scenario.weightedUfM2.toLocaleString('es-CL')} UF/m² ponderado</p>
                <p className="mt-3 border-t border-[var(--n3-line)] pt-3 font-mono text-[10px] text-[var(--n3-text-muted)]">Valor comercial / (1 - margen)</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 text-[var(--n3-text-light)]">
          <div className="flex items-center gap-2"><Database size={17} className="text-[var(--n3-teal-soft)]" /><h2 className="text-lg font-semibold">Caso histórico de la plantilla</h2></div>
          <div className="mt-4 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
            <div className="bg-[var(--n3-deep)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Valor comercial</p><strong className="mt-1 block">15.890 UF</strong></div>
            <div className="bg-[var(--n3-deep)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Oferta Portal histórica</p><strong className="mt-1 block">6 filas / 5 entidades</strong></div>
            <div className="bg-[var(--n3-deep)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">CBRS reproducible</p><strong className="mt-1 block">2 de 6</strong></div>
          </div>
          <div className="mt-4 text-sm leading-relaxed text-[var(--n3-text-light)]">
            <p>El ROL 413-293 aparece una vez en CBRS: 16.700 UF, 227 m² útiles, Las Nieves, octubre de 2024.</p>
            <p className="mt-2 border-l-4 border-[#f39c12] pl-3 text-xs"><strong>No comparable temporalmente:</strong> la plantilla fue modificada en 2020 y la inscripción ocurrió cuatro años después. La diferencia de 810 UF no mide precisión del modelo.</p>
          </div>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-3"><strong>Promedio Portal fuente</strong><span className="mt-1 block text-[var(--n3-text-muted)]">60,45 UF/m² incluyendo el duplicado</span></div>
            <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-3"><strong>Promedio deduplicado</strong><span className="mt-1 block text-[var(--n3-text-muted)]">Rango 58,90 a 60,05 UF/m² según fila canónica</span></div>
          </div>
        </div>

        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 text-[var(--n3-text-light)]">
          <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[var(--n3-teal-soft)]" /><h2 className="text-lg font-semibold">Control de evidencia</h2></div>
          <div className="mt-4 space-y-2">
            {valuationData.qualityIssues.map((issue) => {
              const copy = issueCopy[issue.code]
              return (
                <div key={issue.code} className="flex gap-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-3">
                  <AlertTriangle size={16} className={issue.severity === 'critical' ? 'mt-0.5 shrink-0 text-[var(--destructive)]' : 'mt-0.5 shrink-0 text-[#f39c12]'} />
                  <div><p className="text-sm font-semibold">{copy?.title || issue.code}</p><p className="mt-1 text-xs leading-relaxed text-[var(--n3-text-muted)]">{copy?.detail || issue.detail}</p>{'sourceCell' in issue && issue.sourceCell ? <p className="mt-1 font-mono text-[10px] text-[var(--n3-text-muted)]">{issue.sourceCell}</p> : null}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border border-[var(--n3-text-light)] bg-[var(--n3-deep)] p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Acción por rol</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div><h3 className="font-semibold">Ejecutivo de venta</h3><p className="mt-1 text-xs leading-relaxed text-[var(--n3-text-muted)]">Completar ROL, superficies y comparables vigentes; proponer UF/m² con evidencia revisada.</p></div>
          <div><h3 className="font-semibold">Director de venta</h3><p className="mt-1 text-xs leading-relaxed text-[var(--n3-text-muted)]">Aprobar comparables canónicos, resolver duplicados y validar el escenario de publicación.</p></div>
          <div><h3 className="font-semibold">CEO</h3><p className="mt-1 text-xs leading-relaxed text-[var(--n3-text-muted)]">Monitorear vigencia metodológica, cobertura CBRS/Portal y error temporal de valorizaciones cerradas.</p></div>
        </div>
      </section>
    </div>
  )
}
