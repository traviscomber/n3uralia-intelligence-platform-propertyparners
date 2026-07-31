import { createClient } from '@/lib/supabase/server'

export type ThorAnswerStatus = 'answered' | 'partial' | 'unresolved' | 'contradictory'

export type ThorAnswer = {
  agent: 'Thor'
  question: string
  status: ThorAnswerStatus
  answer: string
  confidence: number
  claims: Array<{
    key: string
    claim: string
    status: string
    confidence: number
    sourceKeys: string[]
    limitations: string | null
  }>
  sources: Array<{
    key: string
    title: string
    type: string
    authorityLevel: number
    status: string
    location: string | null
  }>
  openQuestion: {
    key: string
    status: string
    requiredEvidence: string | null
  } | null
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string) {
  return new Set(normalize(value).split(' ').filter((token) => token.length >= 4))
}

function overlapScore(question: string, candidate: string) {
  const queryTokens = tokens(question)
  if (!queryTokens.size) return 0
  const candidateTokens = tokens(candidate)
  let overlap = 0
  for (const token of queryTokens) if (candidateTokens.has(token)) overlap += 1
  return overlap / queryTokens.size
}

export async function answerWithThor(question: string): Promise<ThorAnswer> {
  const normalizedQuestion = question.trim()
  if (normalizedQuestion.length < 4) throw new Error('La pregunta debe contener al menos cuatro caracteres.')

  const supabase = await createClient()
  const [claimsResult, questionsResult, sourcesResult] = await Promise.all([
    supabase
      .from('thor_claims')
      .select('claim_key,domain,claim,status,confidence,source_keys,limitations')
      .in('status', ['confirmed', 'inferred', 'contradictory']),
    supabase
      .from('thor_questions')
      .select('question_key,question,domain,status,answer_summary,confidence,required_evidence,resolved_by_source_keys'),
    supabase
      .from('thor_source_registry')
      .select('source_key,title,source_type,authority_level,status,location')
      .neq('status', 'excluded'),
  ])

  const error = claimsResult.error ?? questionsResult.error ?? sourcesResult.error
  if (error) throw new Error(error.message)

  const claims = (claimsResult.data ?? [])
    .map((claim) => ({ ...claim, relevance: overlapScore(normalizedQuestion, `${claim.domain} ${claim.claim}`) }))
    .filter((claim) => claim.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || Number(b.confidence) - Number(a.confidence))
    .slice(0, 6)

  const openQuestion = (questionsResult.data ?? [])
    .map((item) => ({ ...item, relevance: overlapScore(normalizedQuestion, `${item.domain} ${item.question} ${item.answer_summary ?? ''}`) }))
    .sort((a, b) => b.relevance - a.relevance)[0]

  const matchedQuestion = openQuestion && openQuestion.relevance >= 0.25 ? openQuestion : null
  const sourceKeys = new Set<string>()
  for (const claim of claims) for (const key of claim.source_keys ?? []) sourceKeys.add(key)
  if (matchedQuestion) for (const key of matchedQuestion.resolved_by_source_keys ?? []) sourceKeys.add(key)

  const sources = (sourcesResult.data ?? [])
    .filter((source) => sourceKeys.has(source.source_key))
    .sort((a, b) => Number(b.authority_level) - Number(a.authority_level))

  let status: ThorAnswerStatus = 'unresolved'
  let answer = 'La evidencia canónica disponible no permite responder esta pregunta con suficiente respaldo.'
  let confidence = 0

  if (matchedQuestion?.status === 'contradictory') {
    status = 'contradictory'
    answer = matchedQuestion.answer_summary ?? 'Las fuentes canónicas presentan una contradicción no resuelta.'
    confidence = Number(matchedQuestion.confidence ?? 0.5)
  } else if (matchedQuestion && ['open', 'blocked', 'partially_answered'].includes(matchedQuestion.status)) {
    status = matchedQuestion.status === 'partially_answered' ? 'partial' : 'unresolved'
    answer = matchedQuestion.answer_summary ?? `No resuelto. Evidencia necesaria: ${matchedQuestion.required_evidence ?? 'definición oficial adicional'}.`
    confidence = Number(matchedQuestion.confidence ?? 0)
  } else if (claims.length > 0) {
    const confirmed = claims.filter((claim) => claim.status === 'confirmed')
    status = confirmed.length === claims.length ? 'answered' : 'partial'
    answer = claims.map((claim) => claim.claim).join(' ')
    confidence = Math.min(...claims.map((claim) => Number(claim.confidence)))
  }

  const response: ThorAnswer = {
    agent: 'Thor',
    question: normalizedQuestion,
    status,
    answer,
    confidence,
    claims: claims.map((claim) => ({
      key: claim.claim_key,
      claim: claim.claim,
      status: claim.status,
      confidence: Number(claim.confidence),
      sourceKeys: claim.source_keys ?? [],
      limitations: claim.limitations,
    })),
    sources: sources.map((source) => ({
      key: source.source_key,
      title: source.title,
      type: source.source_type,
      authorityLevel: Number(source.authority_level),
      status: source.status,
      location: source.location,
    })),
    openQuestion: matchedQuestion
      ? { key: matchedQuestion.question_key, status: matchedQuestion.status, requiredEvidence: matchedQuestion.required_evidence }
      : null,
  }

  const { data: authData } = await supabase.auth.getUser()
  await supabase.from('thor_answer_log').insert({
    question_text: response.question,
    answer_text: response.answer,
    answer_status: response.status,
    confidence: response.confidence,
    claim_keys: response.claims.map((claim) => claim.key),
    source_keys: response.sources.map((source) => source.key),
    requested_by: authData.user?.id ?? null,
  })

  return response
}
