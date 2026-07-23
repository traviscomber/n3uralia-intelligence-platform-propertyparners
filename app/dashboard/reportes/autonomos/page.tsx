import Link from 'next/link'
import { ArrowRight, FileText, Layers3, ShieldCheck, Users } from 'lucide-react'
import { reportAudiences } from '@/lib/report-audiences'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'

const reportSections = [
  ['Executive Summary', 'Resultado, brechas, decisiones y señales críticas en una primera lectura.'],
  ['Business Context', 'Contexto de compañía, sucursal o Partner según la audiencia seleccionada.'],
  ['Performance Evidence', 'Indicadores, evolución y comparaciones presentes en las fuentes auditadas.'],
  ['Risk & Governance', 'Brechas, conciliaciones y limitaciones metodológicas visibles.'],
  ['Appendix', 'Detalle técnico y trazabilidad hacia presentaciones y datos de origen.'],
]

const publicationFormats = [
  ['Web executive view', 'Disponible', 'Lectura interactiva por audiencia dentro de Property Partners.'],
  ['Board brief', 'Estructurado', 'Resumen de gobierno y desempeño para Directorio y CEO.'],
  ['Partner brief', 'Estructurado', 'Vista individual con resultado, evolución y score disponible.'],
  ['PDF / PowerPoint', 'Próxima fase', 'Exportación editorial desde el mismo modelo de contenido, sin duplicar lógica.'],
]

export default function AutonomousReportsPage() {
  const totalUnits = reportAudiences.reduce((sum, item) => sum + item.units, 0)

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Executive Publishing · Fuentes auditadas"
        title="Reportes Ejecutivos"
        description="Un punto único para componer lecturas de Directorio, CEO, Director de Cuenta y Ejecutivo. Cada versión utiliza el mismo contenido validado, adaptado al alcance real de su audiencia."
        actions={[
          { label: 'Abrir reporte de Directorio', href: '/dashboard/reportes/directorio', primary: true },
          { label: 'Ver resumen ejecutivo', href: '/dashboard/ceo' },
        ]}
        meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Powered by N3uralia Intelligence · narrativa sin datos inventados</div>}
      />

      <section>
        <SectionHeading eyebrow="Publishing Overview" title="Cobertura editorial" />
        <MetricGrid>
          <MetricCard label="Audiencias" value={String(reportAudiences.length)} detail="Directorio, CEO, Director de Cuenta y Ejecutivo / Partner." />
          <MetricCard label="Unidades disponibles" value={String(totalUnits)} detail="Vistas derivadas de las presentaciones y estructuras de gestión cargadas." />
          <MetricCard label="Modelo editorial" value="1" detail="Una estructura compartida; múltiples niveles de profundidad." />
          <MetricCard label="Trazabilidad" value="Visible" detail="Cada reporte conserva su alcance y fuente documental." />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="01 · Audience Registry" title="Seleccione la lectura adecuada" description="La audiencia modifica el nivel de detalle, no los datos base ni las reglas de interpretación." />
        <div className="grid gap-4 lg:grid-cols-2">
          {reportAudiences.map((item, index) => (
            <Link key={item.id} href={item.href} className="group border border-[var(--n3-line)] bg-[#0c1111] p-6 transition hover:border-[#d7332b]">
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--n3-line)] bg-[#080d0d] text-[#ff766f]">
                    {item.id === 'directorio' || item.id === 'ceo' ? <Layers3 size={18} /> : <Users size={18} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">0{index + 1} · {item.units} {item.units === 1 ? 'vista' : 'vistas'}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-[var(--n3-text-light)]">{item.label}</h2>
                  </div>
                </div>
                <ArrowRight size={20} className="mt-2 text-[#ff766f] transition group-hover:translate-x-1" />
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--n3-text-muted)]">{item.purpose}</p>
              <div className="mt-5 border-l-2 border-[#d7332b] pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Alcance de fuente</p>
                <p className="mt-1 text-xs leading-5 text-[var(--n3-text-light)]">{item.sourceScope}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Section Registry" title="Arquitectura común del reporte" description="Cada reporte se compone con los mismos bloques editoriales para mantener consistencia entre áreas y audiencias." />
        <IntelligencePanel eyebrow="Executive Narrative" title="Del dato a la decisión" description="La estructura prioriza lectura ejecutiva, contexto, evidencia y gobierno antes del detalle técnico.">
          <div className="grid gap-px bg-[var(--n3-line)] md:grid-cols-5">
            {reportSections.map(([title, detail], index) => (
              <article key={title} className="bg-[#080d0d] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">0{index + 1}</p>
                <h3 className="mt-3 text-sm font-semibold text-[var(--n3-text-light)]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p>
              </article>
            ))}
          </div>
        </IntelligencePanel>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Publication Outputs" title="Un contenido, múltiples formatos" description="Los formatos comparten datos y narrativa. La exportación no debe crear una segunda lógica de negocio." />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <IntelligencePanel eyebrow="Output Registry" title="Canales de publicación" description="Estado actual de las salidas editoriales del sistema.">
            <div className="divide-y divide-[var(--n3-line)]">
              {publicationFormats.map(([name, status, detail]) => (
                <div key={name} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_110px] sm:items-center">
                  <div className="flex gap-3">
                    <FileText size={17} className="mt-0.5 shrink-0 text-[#ff766f]" />
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--n3-text-light)]">{name}</h3>
                      <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p>
                    </div>
                  </div>
                  <span className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{status}</span>
                </div>
              ))}
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Editorial Governance" title="Reglas de publicación" description="Controles que protegen la coherencia y credibilidad de cada reporte." critical>
            <div className="space-y-4 p-5">
              {[
                'No generar recomendaciones, proyecciones ni conclusiones ausentes en las fuentes.',
                'No mezclar niveles de audiencia ni exponer detalle individual fuera de su alcance.',
                'Mantener scores, metas, conciliaciones y denominaciones originales cuando existan.',
                'Mostrar explícitamente limitaciones, ausencia de datos y diferencias metodológicas.',
              ].map((rule) => (
                <div key={rule} className="flex gap-3 text-xs leading-5 text-[var(--n3-text-muted)]">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#ff766f]" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Methodology" title="Transparencia editorial" />
        <MethodologyNote>
          “Ejecutivo” también se muestra como “Partner” porque esa es la denominación presente en las fuentes. “Director de Cuenta” organiza información real por sucursal y por Partner; no altera scores, metas, atribuciones ni resultados originales.
        </MethodologyNote>
      </section>

      <footer className="flex items-center gap-2 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)]">
        <ShieldCheck size={15} /> Property Partners · Executive Publishing Engine · Powered by N3uralia Intelligence
      </footer>
    </IntelligencePage>
  )
}
