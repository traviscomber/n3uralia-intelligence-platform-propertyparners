import { NextRequest, NextResponse } from 'next/server'
import { answerWithThor } from '@/lib/thor-canonical'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { question?: string } | null
    const question = body?.question?.trim()
    if (!question) return NextResponse.json({ error: 'Se requiere una pregunta.' }, { status: 400 })

    const answer = await answerWithThor(question)
    return NextResponse.json(answer)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Thor no pudo procesar la pregunta.' },
      { status: 500 },
    )
  }
}
