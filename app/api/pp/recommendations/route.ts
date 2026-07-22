import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'retired', reason: 'Las recomendaciones heredadas no pertenecen al contrato auditado.' }, { status: 409 })
}

export async function POST() {
  return NextResponse.json({ status: 'retired', writesPerformed: 0, reason: 'No se acepta feedback sobre recomendaciones retiradas.' }, { status: 409 })
}
