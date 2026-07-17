import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { summarizePpRecommendationFeedback, type PpRecommendationFeedbackEntry } from '@/lib/pp-learning'

export const dynamic = 'force-dynamic'

type RecommendationFeedbackRow = {
  id: number
  recommendation_id: string
  title: string
  audience: string
  neighborhood: string | null
  area: string
  feedback_type: 'useful' | 'ignored' | 'review'
  responsible: string | null
  base_score: number
  notes: string | null
  created_at: string
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim()
}

function formatSummary(rows: RecommendationFeedbackRow[]) {
  const summary = summarizePpRecommendationFeedback(rows as PpRecommendationFeedbackEntry[])

  return {
    totals: {
      useful: summary.useful,
      ignored: summary.ignored,
      review: summary.review,
      total: summary.total,
      adoption: summary.adoption_rate,
    },
    narrative: summary.narrative,
    topRecommendations: summary.top_recommendations.map((item) => ({
      recommendation_id: item.recommendation_id,
      title: item.title,
      audience: item.audience,
      neighborhood: item.neighborhood,
      area: item.area,
      useful: item.useful,
      ignored: item.ignored,
      review: item.review,
      total: item.total,
      score: item.net_score,
      latest_at: '',
    })),
    audienceBreakdown: summary.audience_breakdown.map((item) => ({
      audience: item.key,
      useful: item.useful,
      ignored: item.ignored,
      review: item.review,
      total: item.total,
      adoption: item.adoption_rate,
    })),
    neighborhoodBreakdown: summary.neighborhood_breakdown.map((item) => ({
      neighborhood: item.key,
      useful: item.useful,
      ignored: item.ignored,
      review: item.review,
      total: item.total,
      adoption: item.adoption_rate,
    })),
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pp_recommendation_feedback')
      .select('id,recommendation_id,title,audience,neighborhood,area,feedback_type,responsible,base_score,notes,created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    const rows = (data || []) as RecommendationFeedbackRow[]
    return NextResponse.json({
      entries: rows,
      summary: formatSummary(rows),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos cargar las recomendaciones.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<RecommendationFeedbackRow>
    const recommendationId = normalizeText(body.recommendation_id)
    const title = normalizeText(body.title)
    const audience = normalizeText(body.audience).toLowerCase()
    const area = normalizeText(body.area).toLowerCase()
    const feedbackType = body.feedback_type

    if (!recommendationId || !title || !audience || !area || (feedbackType !== 'useful' && feedbackType !== 'ignored' && feedbackType !== 'review')) {
      return NextResponse.json({ error: 'Faltan campos requeridos para registrar feedback.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('pp_recommendation_feedback')
      .insert({
        recommendation_id: recommendationId,
        title,
        audience,
        neighborhood: normalizeText(body.neighborhood) || null,
        area,
        feedback_type: feedbackType,
        responsible: normalizeText(body.responsible) || null,
        base_score: Number(body.base_score || 0),
        notes: normalizeText(body.notes) || null,
      })
      .select('id,recommendation_id,title,audience,neighborhood,area,feedback_type,responsible,base_score,notes,created_at')
      .single<RecommendationFeedbackRow>()

    if (error) throw error

    return NextResponse.json({ entry: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos guardar el feedback.' },
      { status: 500 },
    )
  }
}
