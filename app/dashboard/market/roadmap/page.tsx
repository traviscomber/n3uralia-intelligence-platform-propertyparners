import Link from 'next/link'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'
import { getCanonicalMarketReconciliation } from '@/lib/market-canonical-reconciliation'

const phases = [
  {
    id: '01',
    title: 'Control canónico por archivo',
    status: 'En curso',
    scope: 'Departamentos, casas, proyectos, CBRS y KML con hash, fila de origen, conteos y reglas de cuarentena.',
    exit: 'Cada archivo auditado tiene conteo esperado, conteo materializado, rechazados y brecha visible.',
  },
  {
    id: '02',
    title: 'Materialización Portal completa',
    status: 'Pendiente',
    scope: 'Cargar publicaciones elegibles conservando identidad de origen, observación, precio, superficie, coordenadas y evidencia raw.',
    exit: 'La suma por archivo coincide con el universo canónico aceptado; arriendos permanecen aislados.',
  },
  {
    id: '03',
    title: 'Calidad territorial',
    status: 'Pendiente',
    scope: 'Asignación por KML con estados exact, outside y ambiguous; revisión de registros sin coordenadas o barrio.',
    exit: 'Toda publicación tiene barrio reproducible o una causa explícita de no asignación.',
  },
  {
    id: '04',
    title: 'Materialización CBRS',
    status: 'Pendiente',
    scope: 'Persistir eventos registrales con clave determinística, ROL, fecha, precio, tipología y trazabilidad de fila.',
    exit: 'Las filas aceptadas y rechazadas reconciliadas contra las 40.843 filas auditadas.',
  },
  {
    id: '05',
    title: 'Identidad y vinculación',
    status: 'Pendiente',
    scope: 'Candidatos Portal–CBRS con evidencia y contradicciones; confirmación exclusivamente humana.',
    exit: 'Ninguna coincidencia confirmada sólo por score; toda decisión conserva evidencia auditable.',
  },
  {
    id: '06',
    title: 'Métricas y valorización',
    status: 'Bloqueada por evidencia',
    scope: 'Velocidad, absorción, comparables y valorizaciones utilizando únicamente ventas e identidades confirmadas.',
    exit: 'Cada métrica tiene período, población, fórmula y fuentes reproducibles.',
  },
]

function n(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-CL')
}

function pct(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

export default async function MarketRoadmapPage() {
  const reconciliation = await getCanonicalMarketReconciliation()

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Mercado · Roadmap canónico"
        title="Plan de materialización y control"
        description="Secuencia de desarrollo basada exclusivamente en las fuentes auditadas del repositorio y en evidencia persistida en Supabase. Cada fase tiene una condición de salida verificable."
        actions={[
          { label: 'Reconciliación actual', href: '/dashboard/market/reconciliacion', primary: true },
          { label: 'Volver a Mercado', href: '/dashboard/market' },
        ]}
      />

      {reconciliation.error ? <div role="alert" className="border border-[#a77a22] bg-[#0c1111] p-4 text-sm text-[#f6c453]">La base operativa no está completamente disponible. Los valores desconocidos se muestran como “—”; el universo canónico permanece visible.</div> : null}

      <section>
        <SectionHeading eyebrow="Estado base" title="Universo y cobertura actuales" description="Estos valores determinan el orden de trabajo; no representan equivalencias automáticas entre publicaciones, propiedades y ventas." />
        <MetricGrid>
          <MetricCard label="Portal canónico" value={n(reconciliation.canonical.portalValidListings)} detail="Publicaciones con identificador válido" />
          <MetricCard label="Materializado" value={n(reconciliation.operational.properties)} detail={`${pct(reconciliation.coverage.portalMaterializedRate)} del universo Portal`} />
          <MetricCard label="CBRS canónico" value={n(reconciliation.canonical.cbrsRows)} detail="Filas registrales auditadas" />
          <MetricCard label="Ventas confirmadas" value={n(reconciliation.operational.confirmedSales)} detail="No se infieren desde filas CBRS" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="Fases" title="Roadmap con criterios de salida" />
        <div className="grid gap-4">
          {phases.map((phase) => (
            <article key={phase.id} className="grid gap-4 border border-[var(--n3-line)] bg-[#0c1111] p-5 lg:grid-cols-[100px_1fr_1fr]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fase {phase.id}</p>
                <p className="mt-2 text-sm font-semibold">{phase.status}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{phase.title}</h2>
                <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{phase.scope}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Criterio de salida</p>
                <p className="mt-2 text-xs leading-5">{phase.exit}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <IntelligencePanel eyebrow="Prioridad inmediata" title="Fase 01 · Control por archivo" description="El próximo desarrollo debe separar departamentos, casas, proyectos, CBRS y KML en controles independientes.">
          <div className="space-y-3 p-5 text-sm">
            <p>1. Conteo canónico esperado por archivo.</p>
            <p>2. Conteo materializado en Supabase por source_id y dataset_kind.</p>
            <p>3. Filas aceptadas, rechazadas, en cuarentena y sin materializar.</p>
            <p>4. Hash y nombre de archivo visibles.</p>
            <p>5. Validación que impida declarar una fase completa con diferencias sin explicación.</p>
          </div>
        </IntelligencePanel>
        <IntelligencePanel eyebrow="Reglas no negociables" title="Sin alucinación ni equivalencias falsas" description="Las restricciones se mantienen durante todas las fases." critical>
          <div className="space-y-3 p-5 text-sm">
            <p>Publicación Portal ≠ propiedad única.</p>
            <p>Fila CBRS ≠ venta residencial comparable.</p>
            <p>Retiro de publicación ≠ venta.</p>
            <p>Score de coincidencia ≠ identidad confirmada.</p>
            <p>Dato faltante ≠ permiso para completar por inferencia.</p>
          </div>
        </IntelligencePanel>
      </section>

      <footer className="border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)]">
        <Link href="/dashboard/market/reconciliacion" className="underline underline-offset-4">Abrir reconciliación canónica actual</Link>
      </footer>
    </IntelligencePage>
  )
}
