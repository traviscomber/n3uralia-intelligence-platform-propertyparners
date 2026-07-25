import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'

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
    const question = typeof body.question === 'string' ? body.question.trim() : ''

    if (!question) {
      return NextResponse.json({ error: 'La pregunta es obligatoria' }, { status: 400 })
    }

    const intelligenceContext = buildN3uraliaIntelligenceContext('ceo')

    const result = await runExecutiveReasoningPipeline({
      role: 'ceo',
      question,
      context: {
        source: 'N3uralia Intelligence Engine',
        intelligenceContext,
        requestedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('CEO question route failed', error)
    return NextResponse.json(
      { error: 'No fue posible procesar la consulta ejecutiva' },
      { status: 500 },
    )
  }
}
