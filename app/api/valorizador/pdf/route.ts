import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    status: 'retired',
    reason: 'El PDF heredado incorporaba análisis narrativo no respaldado por las plantillas.',
    replacement: '/api/valorizador/export',
  }, { status: 409 })
}
