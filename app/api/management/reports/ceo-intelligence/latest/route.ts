import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { generateLatestCeoIntelligenceDraft } from '@/lib/ceo-intelligence-report-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const startedAt = Date.now()
  try {
    const result = await generateLatestCeoIntelligenceDraft({ actorId: access.userId })
    return NextResponse.json(result, { status: result.reused ? 200 : 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CEO_INTELLIGENCE_REPORT_FAILED'
    const status = code === 'OPENAI_API_KEY_MISSING'
      ? 503
      : code === 'OPENAI_CEO_INTELLIGENCE_TIMEOUT'
        ? 504
        : code.startsWith('CEO_INTELLIGENCE_OUT_OF_SCOPE') || code === 'CEO_INTELLIGENCE_SCOPE_TAG_MISSING'
          ? 422
          : 500

    console.error('CEO_INTELLIGENCE_REPORT_FAILED', { code, totalMs: Date.now() - startedAt })
    return NextResponse.json({
      error: status === 503
        ? 'La generación del informe ejecutivo está pendiente de configurar.'
        : status === 504
          ? 'La generación del informe ejecutivo excedió el tiempo interactivo disponible. Intenta nuevamente.'
          : status === 422
            ? 'El informe generado salió del alcance contractual de casas en Vitacura y fue rechazado antes de persistir.'
            : 'No fue posible generar el informe ejecutivo del último período disponible.',
      code,
    }, { status })
  }
}
