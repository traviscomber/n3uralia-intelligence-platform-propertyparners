import { createClient } from '@/lib/supabase/server'

export type DecisionOutcome = {
  decision: string
  recommendation: string
  expectedImpact?: string
  actualOutcome?: string
  lessons?: string
}

export async function storeDecisionOutcome(input: DecisionOutcome) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autorizado para guardar memoria ejecutiva')
  }

  const learned = Boolean(input.actualOutcome) && Boolean(input.lessons)
  const timestamp = new Date().toISOString()

  const { data, error } = await supabase
    .from('decision_history')
    .insert({
      user_id: user.id,
      decision: input.decision,
      recommendation: input.recommendation,
      expected_impact: input.expectedImpact ?? null,
      actual_outcome: input.actualOutcome ?? null,
      lessons: input.lessons ?? null,
      learned,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

export function comparePredictionWithOutcome(decision: DecisionOutcome) {
  return {
    decision: decision.decision,
    prediction: decision.expectedImpact,
    reality: decision.actualOutcome,
    learning: decision.lessons,
  }
}
