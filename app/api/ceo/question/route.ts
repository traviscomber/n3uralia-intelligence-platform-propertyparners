import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildCEOIntelligenceContext } from '@/lib/ceo-intelligence-context'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

function classifyQuestion(question: string) {
  const normalized = question.toLowerCase()
  const requiresDecision = /(deber[ií]a|decisi[oó]n|recomienda|conviene|priorizar|riesgo|estrategia)/.test(normalized)
  const highImportance = /(directorio|presupuesto|meta anual|abrir sucursal|cerrar sucursal|inversi[oó]n|contratar|despedir)/.test(normalized)
  const mediumImportance = /(mercado|ventas|cumplimiento|sucursal|captaci[oó]n|conversi[oó]n|valuaci[oó]n|cartera|stock|leads|presentaci[oó]n)/.test(normalized)

  return {
    importance: highImportance ? 'high' as const : mediumImportance ? 'medium' as const : 'low' as const,
    requiresDecision,
  }
}

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

    if (question.length > 2000) {
      return NextResponse.json({ error: 'La pregunta supera el límite permitido' }, { status: 400 })
    }

    const classification = classifyQuestion(question)
    const reasoningMode = selectReasoningMode({ question, ...classification })
    const intelligenceContext = buildCEOIntelligenceContext()

    const result = await runExecutiveReasoningPipeline({
      role: 'ceo',
      question,
      reasoningMode,
      context: {
        source: 'N3uralia Intelligence Engine',
        domains: ['crm', 'targets', 'market', 'valuation', 'reports'],
        intelligenceContext,
        requestedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('CEO question route failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No fue posible procesar la consulta ejecutiva' },
      { status: 500 },
    )
  }
}
