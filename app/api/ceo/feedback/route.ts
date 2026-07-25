import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureCopilotFeedback } from '@/lib/ceo-feedback-learning-loop'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const result = await captureCopilotFeedback({
    question: body.question ?? '',
    answerId: body.answerId ?? '',
    rating: body.rating === 'up' ? 'up' : 'down',
    comment: body.comment,
    contextSources: body.contextSources ?? [],
    role: 'ceo',
    userId: user.id,
  })

  return NextResponse.json(result)
}
