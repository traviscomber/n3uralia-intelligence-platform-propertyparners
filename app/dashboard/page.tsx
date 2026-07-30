import Link from 'next/link'

const modules = [
  {
    number: '01',
    title: 'Inteligencia de Mercado',
    description: 'Oferta, transacciones, propiedades, barrios, microbarrios, comparables e indicadores del mercado inmobiliario de Vitacura.',
    href: '/dashboard/market',
  },
  {
    number: '02',
    title: 'Valorización de Propiedades',
    description: 'Herramienta de valorización con variables objetivas y cualitativas, comparables, ajustes, justificación e informe exportable.',
    href: '/dashboard/valorizador',
  },
  {
    number: '03',
    title: 'Control de Gestión Comercial',
    description: 'Resultados, captaciones, ventas, seguimiento, conversión, productividad, metas, variaciones, rankings y alertas por rol.',
    href: '/dashboard/control',
  },
]

const principles = [
  'Sólo se muestran indicadores respaldados por fuentes identificables.',
  'Cada módulo conserva trazabilidad de datos, período y metodología.',
  'Las funcionalidades adicionales permanecen separadas en Versión 2.',
  'Los accesos y la información visible dependen del perfil del usuario.',
]

export default function DashboardHome() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-16">
      <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">Property Partners Vitacura</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Plataforma integrada de inteligencia inmobiliaria y gestión comercial
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
          La versión actual se limita al alcance funcional contratado: inteligencia de mercado, valorización de propiedades y control de gestión comercial.
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Alcance vigente</p>
            <h2 className="mt-2 text-2xl font-semibold">Tres módulos integrados</h2>
          </div>
          <Link href="/dashboard/version-2" className="text-xs font-semibold text-[var(--n3-text-muted)] hover:text-[#ff766f]">Revisar Versión 2 →</Link>
        </div>

        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module.number} className="flex min-h-[300px] flex-col bg-[#0c1111] p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Módulo {module.number}</span>
                <span className="border border-[var(--n3-line)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Alcance contractual</span>
              </div>
              <h3 className="mt-8 text-2xl font-semibold">{module.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-[var(--n3-text-muted)]">{module.description}</p>
              <Link href={module.href} className="mt-8 border-t border-[var(--n3-line)] pt-4 text-sm font-semibold text-[#ff766f]">Abrir módulo →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Criterio de producto</p>
          <h2 className="mt-3 text-xl font-semibold">Información verificable, sin funcionalidades ajenas al contrato</h2>
          <div className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
            {principles.map((principle) => (
              <div key={principle} className="bg-[#080d0d] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">{principle}</div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Estado del saneamiento</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-[var(--n3-line)] pb-3"><span>Navegación contractual</span><strong className="text-[#ff766f]">Aplicada</strong></div>
            <div className="flex justify-between border-b border-[var(--n3-line)] pb-3"><span>Funciones experimentales</span><strong>Separadas</strong></div>
            <div className="flex justify-between border-b border-[var(--n3-line)] pb-3"><span>Asistentes globales</span><strong>Retirados</strong></div>
            <div className="flex justify-between"><span>Siguiente etapa</span><strong>Completar módulos</strong></div>
          </div>
        </div>
      </section>
    </div>
  )
}
