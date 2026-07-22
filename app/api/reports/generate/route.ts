import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    status: 'retired',
    writesPerformed: 0,
    reason: 'El generador IA heredado mezclaba datos operacionales y narrativa no auditada.',
    replacement: '/api/reports/board',
  }, { status: 409 })
}
