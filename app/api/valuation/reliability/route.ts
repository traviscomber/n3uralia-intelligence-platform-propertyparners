import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireAnyCapability([
      'valuations.self.read',
      'valuations.self.create',
      'valuations.office.read',
      'valuations.office.review',
      'valuations.global.read',
      'valuations.global.approve',
    ])

    const barrio = new URL(request.url).searchParams.get('barrio')?.trim()
    if (!barrio) return NextResponse.json({ error: 'Barrio requerido' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_house_champion_v5_reliability_lookup', { p_barrio: barrio })
    if (error) {
      console.error('VALUATION_CHAMPION_RELIABILITY_LOOKUP_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible cargar confiabilidad del champion.' }, { status: 500 })
    }

    return NextResponse.json({ reliability: data ?? null })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
