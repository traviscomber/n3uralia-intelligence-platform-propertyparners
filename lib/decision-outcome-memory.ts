import { createClient } from '@/lib/supabase/server'

export type DecisionOutcome = {
  decision: string
  recommendation: string
  expectedImpact?: string
  actualOutcome?: string
  lessons?: string
  context?: string
  role?: string
  userId?: string
}

export async function storeDecisionOutcome(input: DecisionOutcome) {
  const supabase = await createClient()

  const { error } = await supabase.from('decision_history').insert({
    decision: input.decision,
    recommendation: input.recommendation,
    expected_impact: input.expectedImpact ?? null,
    outcome: input.actualOutcome ?? null,
    lessons: input.lessons ?? null,
    context: input.context ?? null,
    role: input.role ?? 'ceo',
    user_id: input.userId ?? null,
  })

  return {
    ...input,
    learned: Boolean(input.actualOutcome) && Boolean(input.lessons),
    persisted: !error,
    error: error?.message ?? null,
    timestamp: new Date().toISOString(),
  }
}

export function comparePredictionWithOutcome(decision: DecisionOutcome) {
  return {
    decision: decision.decision,
    prediction: decision.expectedImpact,
    reality: decision.actualOutcome,
    learning: decision.lessons,
  }
}
