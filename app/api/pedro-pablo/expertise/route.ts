import { NextRequest, NextResponse } from 'next/server'
import { requireUserScope, accessErrorResponse } from '@/lib/access-guards'
import { PEDRO_PABLO_VITACURA_EXPERTISE, expertiseCardsForPrompt } from '@/lib/pedro-pablo/vitacura-expertise'

export async function POST(request: NextRequest) {
  try {
    const scope = await requireUserScope()
    const body = await request.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''

    if (!prompt || prompt.length > 800) {
      return NextResponse.json({ error: 'La consulta debe contener entre 1 y 800 caracteres.' }, { status: 400 })
    }

    const cards = expertiseCardsForPrompt(prompt)

    return NextResponse.json({
      available: true,
      scope: scope.scope,
      expertiseProfile: PEDRO_PABLO_VITACURA_EXPERTISE,
      cards,
      interpretationPolicy: 'canonical-first-official-sources-second-expert-interpretation-third',
      writesPerformed: 0,
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
