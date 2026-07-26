import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify director role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (String(profile?.role ?? '').toLowerCase() !== 'director') {
      return NextResponse.json({ error: 'Acceso exclusivo para perfil Director' }, { status: 403 })
    }

    const body = await request.json()
    const question: string = body.question ?? '¿Qué debo saber de mi región hoy?'

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'La pregunta es obligatoria' }, { status: 400 })
    }

    // Select reasoning depth based on question characteristics
    const reasoningMode = selectReasoningMode({
      question,
      importance: body.importance ?? 'high',
      requiresDecision: body.requiresDecision ?? true,
    })

    // Build N3uralia intelligence context scoped to director audience
    const intelligenceContext = buildN3uraliaIntelligenceContext('director')

    const result = await runExecutiveReasoningPipeline({
      role: 'directorio',
      question,
      reasoningMode,
      context: {
        source: 'Director Assistant Widget',
        requestedAt: new Date().toISOString(),
        intelligence: intelligenceContext,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Director question route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error procesando pregunta del director' },
      { status: 500 },
    )
  }
}
