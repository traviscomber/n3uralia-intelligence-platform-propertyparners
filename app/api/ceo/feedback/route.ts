import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (String(profile?.role ?? '').toLowerCase() !== 'ceo') {
      return NextResponse.json({ error: 'Acceso exclusivo para perfil CEO' }, { status: 403 })
    }

    const body = await request.json()
    const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null
    const question = typeof body.question === 'string' ? body.question.trim() : ''

    if (!rating || !question) {
      return NextResponse.json({ error: 'Feedback incompleto' }, { status: 400 })
    }

    const { error } = await supabase.from('copilot_feedback').insert({
      user_id: user.id,
      question,
      answer_summary: typeof body.answerSummary === 'string' ? body.answerSummary : null,
      rating,
      comment: typeof body.comment === 'string' ? body.comment : null,
      sources: Array.isArray(body.sources) ? body.sources.filter((item: unknown) => typeof item === 'string') : [],
    })

    if (error) {
      console.error('CEO feedback persistence failed', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('CEO feedback route failed', error)
    return NextResponse.json({ error: 'No fue posible guardar el feedback' }, { status: 500 })
  }
}
