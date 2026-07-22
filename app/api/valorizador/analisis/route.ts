import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    status: 'retired',
    reason: 'La narrativa IA agregaba factores no presentes en las plantillas de valorización.',
    replacement: '/dashboard/valorizador',
  }, { status: 409 })
}
