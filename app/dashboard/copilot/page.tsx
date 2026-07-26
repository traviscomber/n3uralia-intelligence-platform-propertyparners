import { createCopilotContext } from '@/lib/executive-copilot-context'

export default async function CopilotPage() {
  const context = createCopilotContext('ceo')

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#ff766f]">
          N3uralia Executive Copilot
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Intelligence Assistant
        </h1>
      </header>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <h2 className="text-xl font-semibold">Active Context</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--n3-text-muted)]">
          <p>Role: {context.role}</p>
          <p>Mode: {context.mode}</p>
          <p>Scope: {context.promptScope}</p>
        </div>
      </section>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <h2 className="text-xl font-semibold">Executive Question</h2>
        <p className="mt-3 text-sm text-[var(--n3-text-muted)]">
          Ask about company data, evidence, forecasts, risks and decisions.
          Responses must be generated from N3uralia intelligence layers.
        </p>
      </section>
    </main>
  )
}
