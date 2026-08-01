import { NextRequest, NextResponse } from 'next/server'
import { requireExecutiveAccess } from '@/lib/api-access'
import { analyzeManagementPresentations, findPresentationEvidence } from '@/lib/presentation-analysis-agent'
import canonicalManagement from '@/data/management-canonical-pages.json'

export async function GET(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: access.status === 401 ? 'No autorizado' : 'Acceso denegado' }, { status: access.status })

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const slide = Number(request.nextUrl.searchParams.get('slide') ?? '')
  const deck = request.nextUrl.searchParams.get('deck')?.trim().toLowerCase() ?? ''
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 30)
  const canonicalOnly = request.nextUrl.searchParams.get('canonical') === 'true'
  const analysis = analyzeManagementPresentations()

  if (canonicalOnly) return NextResponse.json(canonicalManagement)

  if (query) {
    return NextResponse.json({
      query,
      results: findPresentationEvidence(query, Number.isFinite(limit) ? limit : 30),
      canonical: canonicalManagement,
      generatedAt: analysis.generatedAt,
      source: analysis.source,
    })
  }

  if (Number.isFinite(slide) && slide > 0) {
    const results = analysis.slides.filter((item) => item.slide === slide && (!deck || item.deck.toLowerCase().includes(deck)))
    const canonicalPage = canonicalManagement.pages.find((item) => item.page === slide) ?? null
    return NextResponse.json({ results, canonicalPage, generatedAt: analysis.generatedAt, source: analysis.source })
  }

  return NextResponse.json({ ...analysis, canonical: canonicalManagement })
}
