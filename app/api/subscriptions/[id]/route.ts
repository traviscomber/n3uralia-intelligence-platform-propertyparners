import { NextRequest, NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import {
  updateEmailSubscription,
  deleteEmailSubscription,
} from '@/lib/report-subscriptions'

export const runtime = 'nodejs'

// PATCH /api/subscriptions/[id] - Update a subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCopilotRole(['ceo', 'director'], { request })

    const { id } = await params
    const body = await request.json()

    const updated = await updateEmailSubscription(id, body)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Subscription updated',
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('[subscriptions] PATCH failed:', message)
    return NextResponse.json(
      { error: 'Failed to update subscription', details: message },
      { status: 500 }
    )
  }
}

// DELETE /api/subscriptions/[id] - Delete a subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCopilotRole(['ceo', 'director'], { request })

    const { id } = await params

    await deleteEmailSubscription(id)

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted',
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('[subscriptions] DELETE failed:', message)
    return NextResponse.json(
      { error: 'Failed to delete subscription', details: message },
      { status: 500 }
    )
  }
}
