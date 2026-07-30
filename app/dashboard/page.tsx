import Link from 'next/link'
import {
  OperationalDataCard,
  OperationalDataGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'
import { getOperationalMarketSnapshot } from '@/lib/market-operational'
import { createClient } from '@/lib/supabase/server'

const modules = [
  {
    number: '01',
    title: 'Inteligencia de Mercado',
    description: 'Registros de oferta, fuentes, barrios, calidad de datos e indicadores disponibles. Las ventas y métricas derivadas permanecen pendientes hasta cargar transacciones confirmadas.',
    href: '/dashboard/market',
  },
  {
    number: '02',
    title: 'Valorización de Propiedades',
    description: 'Creación de casos en borrador, comparables documentados, ajustes, revisión, aprobación, expediente y registro de decisiones.',
    href: '/dashboard/valuation',
  },
  {
    number: '03',
    title: 'Control de Gestión Comercial',
    description: 'Métricas, metas, variaciones, rankings y alertas por rol. Los resultados aparecen únicamente cuando existen entidades y datos operativos cargados.',
    href: '/dashboard/control',
  },
]

export default async function DashboardHome() {
  const [market, supabase] = await Promise.all([getOperationalMarketSnapshot(), createClient()])
  const [valuationCases, managementEntities] = await Promise.all([
    supabase.from('valuation_cases').select('id', { count: 'exact', head: true }),
    supabase.from('management_entities').select('id', { count: 'exact', head: true }),
  ])

  const valuationCount = valuationCases.error ? null : valuationCases.count ?? 0
  const managementCount = managementEntities.error ? null : managementEntities.count ?? 0

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-16">
      <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">Property Partners Vitacura</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Plataforma integrada de inteligencia inmobiliaria y gestión comercial</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Resumen ejecutivo conectado a las tablas operativas. Los estados sin evidencia permanecen explícitamente vacíos.</p>
      </header>

      <section>
        <SectionHeading eyebrow="Estado ejecutivo" title="Qué sabemos hoy" description="Cada tarjeta indica valor, estado, fuente, fecha y limitación." />
        <OperationalDataGrid>
          <OperationalDataCard label="Mercado" value={`${market.canonicalProperties ?? 0} registros`} status={(market.canonicalProperties ?? 0) > 0 ? 'candidate' : 'no_data'} observedAt={market.latestObservedAt} source="market_properties" explanation={`${market.confirmedProperties ?? 0} identidades confirmadas y ${market.missingNeighborhoods ?? 0} registros sin barrio.`} />
          <OperationalDataCard label="Publicaciones observadas" value={market.activeInventory ?? 0} status={(market.activeInventory ?? 0) > 0 ? 'observed' : 'no_data'} observedAt={market.latestObservedAt} source="market_current_listings" explanation="Estado activo al último corte observado; no equivale a disponibilidad verificada hoy." />
          <OperationalDataCard label="Valorizaciones" value={valuationCount ?? 'Sin acceso'} status={valuationCount === null ? 'incomplete' : valuationCount > 0 ? 'confirmed' : 'no_data'} observedAt={null} source="valuation_cases" explanation={valuationCount === null ? 'No fue posible consultar el conteo con el usuario actual.' : 'Casos persistidos en el flujo canónico de valorización.'} />
          <OperationalDataCard label="Entidades de gestión" value={managementCount ?? 'Sin acceso'} status={managementCount === null ? 'incomplete' : managementCount > 0 ? 'confirmed' : 'no_data'} observedAt={null} source="management_entities" explanation={managementCount === null ? 'No fue posible consultar el conteo con el usuario actual.' : 'Entidades organizacionales disponibles para métricas, metas y alertas.'} />
        </OperationalDataGrid>
      </section>

      <section>
        <SectionHeading eyebrow="Alcance vigente" title="Tres módulos integrados" />
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module.number} className="flex min-h-[280px] flex-col bg-[#0c1111] p-6">
              <div className="flex items-center justify-between gap-4"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Módulo {module.number}</span><span className="border border-[var(--n3-line)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Alcance contractual</span></div>
              <h3 className="mt-8 text-2xl font-semibold">{module.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-[var(--n3-text-muted)]">{module.description}</p>
              <Link href={module.href} className="mt-8 border-t border-[var(--n3-line)] pt-4 text-sm font-semibold text-[#ff766f]">Abrir módulo →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Regla de lectura</p>
        <h2 className="mt-3 text-xl font-semibold">Dato, calidad y brecha se presentan por separado</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--n3-text-muted)]">Confirmado significa evidencia validada. Candidato requiere conciliación. Observado corresponde a una fecha específica. Incompleto indica una brecha de calidad. Sin datos significa que no existe evidencia operativa suficiente.</p>
      </section>
    </div>
  )
}
