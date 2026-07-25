import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null

    if (!rating) {
      return NextResponse.json({ error: 'Rating inválido' }, { status: 400 })
    }

    const { error } = await supabase.from('copilot_feedback').insert({
      user_id: user.id,
      question: body.question ?? null,
      answer_summary: body.answerSummary ?? null,
      rating,
      comment: body.comment ?? null,
      sources: Array.isArray(body.sources) ? body.sources : [],
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No fue posible guardar el feedback' }, { status: 500 })
  }
}
