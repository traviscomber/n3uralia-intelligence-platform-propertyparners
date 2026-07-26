export type AgentContext = {
  agent: string
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  companyKnowledge: {
    documents: string[]
    memories: string[]
    evidence: string[]
    decisions: string[]
  }
}

export function buildAgentContext(input: AgentContext) {
  return {
    ...input,
    instruction:
      'El agente debe priorizar conocimiento empresarial, evidencia validada y memoria histórica antes de generar recomendaciones.',
  }
}
