import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { getAugustBoard } from '@/lib/management-august-board'

export async function GET() {
  try {
    await requireAnyCapability(['management.global.read','management.office.read'])
  } catch (error) {
    return accessErrorResponse(error)
  }

  return NextResponse.json(getAugustBoard(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
