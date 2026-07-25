import { runExecutiveReasoningPipeline } from '../lib/executive-reasoning-pipeline'

export async function runCEOQuestionTest() {
  return runExecutiveReasoningPipeline({
    role: 'ceo',
    question: '¿Qué debo saber hoy?',
    context: {
      sources: [
        'CRM',
        'Targets 2026',
        'Market Intelligence',
        'Valuation Intelligence',
        'Company Knowledge',
        'Decision History',
      ],
    },
  })
}
