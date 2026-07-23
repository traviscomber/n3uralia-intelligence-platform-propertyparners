import Link from 'next/link'
import { Activity, ArrowRight, BarChart3, Bot, Database, FileText, Home, ShieldCheck, Sparkles } from 'lucide-react'

const agents = [
  {
    id: 'market-intelligence',
    name: 'Market Intelligence',
    role: 'Agente de evidencia de mercado',
    description: 'Consolida datos de Vitacura, fuentes Portal + CBRS, importaciones y señales del mercado en hallazgos trazables.',
    href: '/dashboard/market',
    action: 'Abrir inteligencia de mercado',
    icon: BarChart3,
    inputs: ['Mercado Vitacura', 'Portal + CBRS', 'Importaciones verificadas'],
    outputs: ['Tendencias', 'Comparables', 'Alertas de mercado'],
  },
  {
    id: 'valuation',
    name: 'Valorizador IA',
    role: 'Agente de valorización',
    description: 'Estima rangos de valor con evidencia, comparables y atributos del inmueble, manteniendo revisión humana antes de publicar.',
    href: '/dashboard/valorizador',
    action: 'Abrir valorizador',
    icon: Home,
    inputs: ['Propiedad auditada', 'Comparables', 'Modelo validado'],
    outputs: ['Rango estimado', 'Confianza', 'Explicación del cálculo'],
  },
  {
    id: 'reports',
    name: 'Reportes IA',
    role: 'Agente ejecutivo de síntesis',
    description: 'Convierte los hallazgos aprobados de mercado y valorización en reportes ejecutivos para CEO, directores y partners.',
    href: '/dashboard/reportes/autonomos',
    action: 'Abrir reportes programados',
    icon: FileText,
    inputs: ['Hallazgos aprobados', 'Metas 2026', 'Control de gestión'],
    outputs: ['Resumen ejecutivo', 'Alertas críticas', 'Próximas acciones'],
  },
]

const workflow = [
  { step: '01', title: 'Market Intelligence', text: 'Obtiene y organiza evidencia verificable.' },
  { step: '02', title: 'Valorizador IA', text: 'Usa la evidencia para estimar valor y confianza.' },
  { step: '03', title: 'Reportes IA', text: 'Sintetiza resultados aprobados para dirección.' },
]

export default function AgentsControlCenterPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="overflow-hidden rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)]">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_0.6fr] lg:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-1.5 text-xs font-medium text-[var(--n3-teal-soft)]">
              <Sparkles className="h-3.5 w-3.5" />
              Sistema multiagente Property Partners
            </div>
            <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-[var(--n3-text-light)] sm:text-3xl">
              Centro de control de agentes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)] sm:text-base">
              Los tres agentes trabajan como una cadena controlada: primero reúnen evidencia, luego valorizan y finalmente producen inteligencia ejecutiva. Ningún resultado crítico se publica sin trazabilidad y revisión humana.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start">
            <Metric label="Agentes" value="3" />
            <Metric label="Flujo" value="Conectado" />
            <Metric label="Fuentes" value="Trazables" />
            <Metric label="Control" value="Humano" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {agents.map((agent, index) => {
          const Icon = agent.icon
          return (
            <article key={agent.id} className="flex min-h-[410px] flex-col rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] text-[var(--n3-teal-soft)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-[var(--n3-line)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">
                  Agente {index + 1}
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">{agent.role}</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{agent.name}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">{agent.description}</p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <AgentList title="Entradas" items={agent.inputs} icon={<Database className="h-3.5 w-3.5" />} />
                <AgentList title="Resultados" items={agent.outputs} icon={<Activity className="h-3.5 w-3.5" />} />
              </div>

              <div className="mt-auto pt-6">
                <Link href={agent.href} className="inline-flex w-full items-center justify-between rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-3 text-sm font-medium text-[var(--n3-text-light)] transition hover:border-[var(--n3-teal-soft)]">
                  {agent.action}
                  <ArrowRight className="h-4 w-4 text-[var(--n3-teal-soft)]" />
                </Link>
              </div>
            </article>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-[var(--n3-teal-soft)]" />
            <div>
              <h2 className="font-semibold text-[var(--n3-text-light)]">Flujo operativo</h2>
              <p className="text-sm text-[var(--n3-text-muted)]">Orden recomendado para producir inteligencia confiable.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {workflow.map((item) => (
              <div key={item.step} className="relative rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-4">
                <span className="text-[10px] font-semibold tracking-[0.18em] text-[var(--n3-teal-soft)]">{item.step}</span>
                <h3 className="mt-3 text-sm font-semibold text-[var(--n3-text-light)]">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--n3-teal-soft)]" />
            <h2 className="font-semibold text-[var(--n3-text-light)]">Reglas de operación</h2>
          </div>
          <ul className="mt-5 space-y-3 text-sm leading-5 text-[var(--n3-text-muted)]">
            <Rule>Solo se utilizan fuentes identificadas y fechadas.</Rule>
            <Rule>La confianza debe mostrarse junto al resultado.</Rule>
            <Rule>Las alertas críticas requieren revisión humana.</Rule>
            <Rule>Los reportes conservan evidencia y versión.</Rule>
          </ul>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">{value}</div>
    </div>
  )
}

function AgentList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--n3-text-light)]">
        <span className="text-[var(--n3-teal-soft)]">{icon}</span>
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => <li key={item} className="text-xs leading-5 text-[var(--n3-text-muted)]">• {item}</li>)}
      </ul>
    </div>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--n3-teal-soft)]" />
      <span>{children}</span>
    </li>
  )
}
