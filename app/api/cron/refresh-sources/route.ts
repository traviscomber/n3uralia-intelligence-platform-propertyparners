import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: false,
    status: 'manual_validation_only',
    writesPerformed: 0,
    error: 'La captura viva es manual y requiere validación; no se ejecuta mediante cron.',
  }, { status: 409 })
}
