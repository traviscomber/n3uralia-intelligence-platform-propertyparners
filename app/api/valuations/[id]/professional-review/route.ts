import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, assertProfileVisible, requireAnyCapability } from '@/lib/access-guards'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireAnyCapability([
      'valuations.self.read',
      'valuations.office.read',
      'valuations.global.read',
    ])
    const supabase = await createClient()
    const { id } = await context.params

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .select('id,requested_by')
      .eq('id', id)
      .maybeSingle()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    assertProfileVisible(scope, valuationCase.requested_by)

    const { data, error } = await supabase.rpc('valuation_professional_review_v1', { p_case_id: id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    return accessErrorResponse(error)
  }
}
