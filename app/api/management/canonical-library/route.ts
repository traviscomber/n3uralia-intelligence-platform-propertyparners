import { NextRequest, NextResponse } from 'next/server'
import { requireExecutiveAccess } from '@/lib/api-access'
import {
  getCanonicalDeck,
  getCanonicalLibrarySummary,
  getCanonicalSlide,
  searchCanonicalSlides,
} from '@/lib/canonical-presentation-library'

export async function GET(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.status === 401 ? 'No autorizado' : 'Acceso denegado' },
      { status: access.status },
    )
  }

  const deck = Number(request.nextUrl.searchParams.get('deck') ?? '')
  const page = Number(request.nextUrl.searchParams.get('page') ?? '')
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50)

  if (query) {
    return NextResponse.json({
      query,
      source: 'data/presentations-2026.json',
      results: searchCanonicalSlides(query, Number.isFinite(limit) ? limit : 50),
    })
  }

  if (Number.isFinite(deck) && deck > 0 && Number.isFinite(page) && page > 0) {
    const slide = getCanonicalSlide(deck, page)
    return slide
      ? NextResponse.json({ status: 'canonical', slide })
      : NextResponse.json({ error: 'Página canónica no encontrada' }, { status: 404 })
  }

  if (Number.isFinite(deck) && deck > 0) {
    const presentation = getCanonicalDeck(deck)
    return presentation
      ? NextResponse.json({ status: 'canonical', presentation })
      : NextResponse.json({ error: 'Presentación canónica no encontrada' }, { status: 404 })
  }

  return NextResponse.json(getCanonicalLibrarySummary())
}
