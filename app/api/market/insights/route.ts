import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'retired',
    reason: 'Los insights heredados dependían de market_data no conciliado.',
    replacement: '/dashboard/market',
  }, { status: 409 })
}
