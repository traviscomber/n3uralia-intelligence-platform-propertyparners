import { NextResponse } from 'next/server'
import { buildValuationPdfBuffer } from '@/lib/valuation-pdf'
import { buildFallbackValuationAnalysis, type ValuationAnalysis, type ValuationRequest } from '@/lib/valuation-ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function asError(error: unknown, fallback: string) {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return new Error((error as { message: string }).message)
  }
  return new Error(fallback)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      valuation?: ValuationRequest
      analysis?: ValuationAnalysis | null
    }

    if (!body.valuation || !body.valuation.neighborhood) {
      return NextResponse.json({ error: 'Faltan datos para generar el PDF.' }, { status: 400 })
    }

    const analysis = body.analysis || buildFallbackValuationAnalysis(body.valuation)
    const pdfBuffer = await buildValuationPdfBuffer(body.valuation, analysis)
    const filename = `${new Date().toISOString().slice(0, 10)}_Valorizacion_Vitacura.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: asError(error, 'Error al generar el PDF de valorizacion.').message },
      { status: 500 },
    )
  }
}

