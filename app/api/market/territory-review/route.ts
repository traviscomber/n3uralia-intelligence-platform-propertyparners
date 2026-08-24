import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability, requireMfaLevel2 } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(request: Request) {
  try {
    await requireAnyCapability([
      'market.manage_sources',
      'properties.global.assign',
      'properties.office.assign',
    ])
    await requireMfaLevel2()

    const body = await request.json().catch(() => null)
    const sourceId = String(body?.sourceId ?? '').trim()
    const sourceListingId = String(body?.sourceListingId ?? '').trim()
    const neighborhoodId = String(body?.neighborhoodId ?? '').trim()
    const decision = String(body?.decision ?? '').trim()

    if (!UUID_PATTERN.test(sourceId) || !UUID_PATTERN.test(neighborhoodId)) {
      return NextResponse.json({ error: 'Selección inválida.' }, { status: 400 })
    }
    if (!sourceListingId || sourceListingId.length > 200) {
      return NextResponse.json({ error: 'Aviso inválido.' }, { status: 400 })
    }
    if (decision !== 'accepted' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Decisión inválida.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('review_market_house_territory_v1', {
      p_source_id: sourceId,
      p_source_listing_id: sourceListingId,
      p_neighborhood_id: neighborhoodId,
      p_decision: decision,
    })

    if (error || data !== true) {
      return NextResponse.json({ error: 'No fue posible guardar la revisión.' }, { status: 400 })
    }

    return NextResponse.json({ saved: true })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
