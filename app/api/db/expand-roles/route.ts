import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'retired', writesPerformed: 0, error: 'Endpoint heredado retirado por seguridad y procedencia.' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ status: 'retired', writesPerformed: 0, error: 'Endpoint heredado retirado por seguridad y procedencia.' }, { status: 410 })
}

export async function DELETE() {
  return NextResponse.json({ status: 'retired', writesPerformed: 0, error: 'Endpoint heredado retirado por seguridad y procedencia.' }, { status: 410 })
}
