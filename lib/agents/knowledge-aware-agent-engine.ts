import { buildAgentContext } from './agent-context-adapter'

export async function executeKnowledgeAwareAgent(input: {
  agent: string
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  documents: string[]
  memories: string[]
  evidence: string[]
  decisions: string[]
}) {
  const context = buildAgentContext({
    agent: input.agent,
    role: input.role,
    companyKnowledge: {
      documents: input.documents,
      memories: input.memories,
      evidence: input.evidence,
      decisions: input.decisions,
    },
  })

  return {
    agent: input.agent,
    question: input.question,
    context,
    status: 'ready_for_reasoning',
    rule:
      'No generar recomendaciones sin utilizar el contexto empresarial disponible.',
  }
}
