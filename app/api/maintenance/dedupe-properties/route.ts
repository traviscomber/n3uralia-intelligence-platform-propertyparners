import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ status: 'retired', writesPerformed: 0, error: 'Deduplicación heredada retirada: el catálogo operacional no es una fuente auditada.' }, { status: 410 })
}
