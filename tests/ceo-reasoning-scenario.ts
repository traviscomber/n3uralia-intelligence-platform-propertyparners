import { runExecutiveReasoningPipeline } from '../lib/executive-reasoning-pipeline'

export async function runCEOQuestionTest() {
  return runExecutiveReasoningPipeline({
    role: 'ceo',
    question: '¿Qué debo saber hoy?',
    context: {
      source: 'Test Runner',
      requestedAt: new Date().toISOString(),
    },
  })
}
