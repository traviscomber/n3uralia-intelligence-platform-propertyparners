import { createKnowledgeContext } from '@/lib/copilot-knowledge-router'
import { createCopilotContext } from '@/lib/executive-copilot-context'

export default async function CopilotChatPage() {
  const roleContext = createCopilotContext('ceo')
  const knowledge = createKnowledgeContext('Executive analysis request')

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#ff766f]">
          N3uralia Executive Copilot
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Conversational Intelligence
        </h1>
      </header>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <h2 className="text-xl font-semibold">CEO Context</h2>
        <p className="mt-3 text-sm text-[var(--n3-text-muted)]">
          Role: {roleContext.role} · Mode: {roleContext.mode}
        </p>
      </section>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <h2 className="text-xl font-semibold">Intelligence Rules</h2>
        <p className="mt-3 text-sm text-[var(--n3-text-muted)]">
          {knowledge.rule}
        </p>
      </section>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <textarea
          className="min-h-32 w-full bg-transparent text-sm outline-none"
          placeholder="Pregunte sobre la empresa, decisiones, riesgos o forecast..."
        />
      </section>
    </main>
  )
}
