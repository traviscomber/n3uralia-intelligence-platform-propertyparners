import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: false,
    status: 'quarantined',
    writesPerformed: 0,
    error: 'Actualización automática deshabilitada hasta conciliar los scrapers con los archivos auditados.',
  }, { status: 409 })
}
