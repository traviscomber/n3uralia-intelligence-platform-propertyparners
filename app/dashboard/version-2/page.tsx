import Link from 'next/link'

const futureCapabilities = [
  {
    title: 'Copilotos por rol',
    description: 'Asistentes de inteligencia para CEO, directores y partners, con respuestas limitadas a evidencia autorizada.',
  },
  {
    title: 'Casos y decisiones ejecutivas',
    description: 'Bandejas de casos, preguntas abiertas, validación humana y seguimiento de decisiones.',
  },
  {
    title: 'Grafos de decisión',
    description: 'Representación de relaciones entre evidencia, riesgos, recomendaciones, decisiones y acciones.',
  },
  {
    title: 'Modelos y validación avanzada',
    description: 'Laboratorio de modelos, evaluación de readiness, experimentación y métricas de calidad.',
  },
  {
    title: 'Conocimiento corporativo',
    description: 'Repositorio consultable de documentos, reglas, metodologías y contexto institucional.',
  },
  {
    title: 'Razonamiento y automatización avanzada',
    description: 'Pipelines de evidencia, inferencia, recomendación y ejecución supervisada.',
  },
]

export default function VersionTwoPage() {
  return (
    <div className="mx-auto max-w-[1300px] space-y-8 pb-16">
      <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--n3-text-muted)]">Fuera del alcance vigente</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Versión 2</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
          Estas capacidades se conservan como evolución futura. No forman parte de los criterios de aceptación de la versión contractual actual y no deben interferir con los tres módulos comprometidos.
        </p>
      </header>

      <div className="border border-[#d7332b] bg-[#0c1111] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">Estado</p>
        <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
          Funcionalidades separadas y sin compromiso de entrega en la primera versión. Su activación requerirá priorización, definición funcional y, cuando corresponda, una orden de cambio.
        </p>
      </div>

      <section className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-2 xl:grid-cols-3">
        {futureCapabilities.map((capability, index) => (
          <article key={capability.title} className="min-h-[230px] bg-[#0c1111] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">V2 · {String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-5 text-xl font-semibold">{capability.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">{capability.description}</p>
            <div className="mt-6 inline-flex border border-[var(--n3-line)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">No activa</div>
          </article>
        ))}
      </section>

      <Link href="/dashboard" className="inline-flex border border-[var(--n3-line)] px-4 py-3 text-sm font-semibold hover:border-[#d7332b]">
        Volver al alcance contractual
      </Link>
    </div>
  )
}
