export type PpRecommendationFeedbackEntry = {
  id: number
  recommendation_id: string
  title: string | null
  audience: string | null
  neighborhood: string | null
  area: string | null
  feedback_type: 'useful' | 'ignored' | 'review'
  responsible: string | null
  base_score: number | null
  notes: string | null
  created_at: string
}

type RecommendationBucket = {
  recommendation_id: string
  title: string
  audience: string
  neighborhood: string
  area: string
  useful: number
  ignored: number
  review: number
  total: number
  net_score: number
  adoption_rate: number
}

type AggregateBucket = {
  key: string
  label: string
  useful: number
  ignored: number
  review: number
  total: number
  adoption_rate: number
}

export type PpRecommendationFeedbackSummary = {
  total: number
  useful: number
  ignored: number
  review: number
  adoption_rate: number
  useful_share: number
  top_recommendations: RecommendationBucket[]
  audience_breakdown: AggregateBucket[]
  neighborhood_breakdown: AggregateBucket[]
  narrative: string
}

export type PpLearningSnapshot = {
  report_key: string
  week_start: string
  week_end: string
  total_feedback: number
  useful_count: number
  ignored_count: number
  review_count: number
  adoption_rate: number
  summary: string
  top_recommendations: RecommendationBucket[]
  audience_breakdown: AggregateBucket[]
  neighborhood_breakdown: AggregateBucket[]
  generated_at: string
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const cleaned = (value || '').trim()
  return cleaned || fallback
}

function safeRate(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Number(((numerator / denominator) * 100).toFixed(1))
}

function summarizeBucket(map: Map<string, AggregateBucket>, key: string, label: string, feedbackType: PpRecommendationFeedbackEntry['feedback_type']) {
  const current = map.get(key) || {
    key,
    label,
    useful: 0,
    ignored: 0,
    review: 0,
    total: 0,
    adoption_rate: 0,
  }

  current.total += 1
  if (feedbackType === 'useful') current.useful += 1
  if (feedbackType === 'ignored') current.ignored += 1
  if (feedbackType === 'review') current.review += 1
  current.adoption_rate = safeRate(current.useful, current.total)
  map.set(key, current)
}

export function summarizePpRecommendationFeedback(entries: PpRecommendationFeedbackEntry[]): PpRecommendationFeedbackSummary {
  const recommendationMap = new Map<string, RecommendationBucket>()
  const audienceMap = new Map<string, AggregateBucket>()
  const neighborhoodMap = new Map<string, AggregateBucket>()

  let useful = 0
  let ignored = 0
  let review = 0

  for (const entry of entries) {
    const recommendationKey = normalizeLabel(entry.recommendation_id, 'unknown')
    const recommendation = recommendationMap.get(recommendationKey) || {
      recommendation_id: recommendationKey,
      title: normalizeLabel(entry.title, 'Sin titulo'),
      audience: normalizeLabel(entry.audience, 'Sin audiencia'),
      neighborhood: normalizeLabel(entry.neighborhood, 'Vitacura'),
      area: normalizeLabel(entry.area, 'Mercado'),
      useful: 0,
      ignored: 0,
      review: 0,
      total: 0,
      net_score: 0,
      adoption_rate: 0,
    }

    recommendation.total += 1

    if (entry.feedback_type === 'useful') {
      useful += 1
      recommendation.useful += 1
      recommendation.net_score += 2
    }

    if (entry.feedback_type === 'ignored') {
      ignored += 1
      recommendation.ignored += 1
      recommendation.net_score -= 1
    }

    if (entry.feedback_type === 'review') {
      review += 1
      recommendation.review += 1
      recommendation.net_score += 1
    }

    recommendation.adoption_rate = safeRate(recommendation.useful, recommendation.total)
    recommendationMap.set(recommendationKey, recommendation)

    summarizeBucket(
      audienceMap,
      normalizeLabel(entry.audience, 'Sin audiencia'),
      normalizeLabel(entry.audience, 'Sin audiencia'),
      entry.feedback_type,
    )
    summarizeBucket(
      neighborhoodMap,
      normalizeLabel(entry.neighborhood, 'Vitacura'),
      normalizeLabel(entry.neighborhood, 'Vitacura'),
      entry.feedback_type,
    )
  }

  const total = entries.length
  const adoption_rate = safeRate(useful, total)
  const useful_share = safeRate(useful, useful + ignored + review)

  const top_recommendations = [...recommendationMap.values()].sort((a, b) => {
    if (b.net_score !== a.net_score) return b.net_score - a.net_score
    if (b.useful !== a.useful) return b.useful - a.useful
    return b.total - a.total
  })

  const audience_breakdown = [...audienceMap.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
  const neighborhood_breakdown = [...neighborhoodMap.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  const topRecommendation = top_recommendations[0]
  const weakRecommendation = [...top_recommendations].sort((a, b) => a.net_score - b.net_score || b.total - a.total)[0]
  const topAudience = audience_breakdown[0]
  const topNeighborhood = neighborhood_breakdown[0]

  const narrative =
    total > 0
      ? [
          `Se consolidaron ${total} señales de feedback con adopcion de ${adoption_rate}% y ${useful} marcadas como utiles.`,
          topRecommendation
            ? `La recomendacion con mejor traccion fue "${topRecommendation.title}" en ${topRecommendation.audience} (${topRecommendation.adoption_rate}% de adopcion).`
            : 'Aun no hay una recomendacion lider clara.',
          weakRecommendation && weakRecommendation.net_score < 0
            ? `La señal a revisar es "${weakRecommendation.title}", que acumula mas rechazo que utilidad.`
            : 'No hay recomendaciones fuertemente penalizadas.',
          topAudience ? `La audiencia con mas actividad fue ${topAudience.label}.` : 'No hay corte por audiencia aun.',
          topNeighborhood ? `El barrio con mas feedback fue ${topNeighborhood.label}.` : 'No hay corte por barrio aun.',
        ].join(' ')
      : 'No hay feedback persistido todavia. El aprendizaje IA seguira operando con lectura determinista hasta acumular senales.'

  return {
    total,
    useful,
    ignored,
    review,
    adoption_rate,
    useful_share,
    top_recommendations,
    audience_breakdown,
    neighborhood_breakdown,
    narrative,
  }
}

export function buildPpLearningSnapshot(
  summary: PpRecommendationFeedbackSummary,
  weekStart: string,
  weekEnd: string,
  generatedAt: string,
): PpLearningSnapshot {
  return {
    report_key: `pp-learning:${weekStart}`,
    week_start: weekStart,
    week_end: weekEnd,
    total_feedback: summary.total,
    useful_count: summary.useful,
    ignored_count: summary.ignored,
    review_count: summary.review,
    adoption_rate: summary.adoption_rate,
    summary: summary.narrative,
    top_recommendations: summary.top_recommendations.slice(0, 5),
    audience_breakdown: summary.audience_breakdown.slice(0, 8),
    neighborhood_breakdown: summary.neighborhood_breakdown.slice(0, 8),
    generated_at: generatedAt,
  }
}
