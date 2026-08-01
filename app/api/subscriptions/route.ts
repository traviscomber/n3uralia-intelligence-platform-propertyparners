import { NextRequest, NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import {
  addEmailSubscription,
  getEmailSubscriptions,
  updateEmailSubscription,
  deleteEmailSubscription,
} from '@/lib/report-subscriptions'

export const runtime = 'nodejs'

// GET /api/subscriptions - List all email subscriptions
export async function GET(request: NextRequest) {
  try {
    await requireCopilotRole(['ceo', 'director'], { request })

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType')
    const entityId = searchParams.get('entityId')
    const active = searchParams.get('active')

    const subscriptions = await getEmailSubscriptions({
      reportType: reportType || undefined,
      entityId: entityId || undefined,
      active: active !== null ? active === 'true' : undefined,
    })

    return NextResponse.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('[subscriptions] GET failed:', message)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions', details: message },
      { status: 500 }
    )
  }
}

// POST /api/subscriptions - Add new email subscription
export async function POST(request: NextRequest) {
  try {
    await requireCopilotRole(['ceo', 'director'], { request })

    const body = await request.json()
    const { email, reportType, cadence, recipientName, recipientRole, entityId, notes } = body

    if (!email || !reportType || !cadence) {
      return NextResponse.json(
        { error: 'Missing required fields: email, reportType, cadence' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const subscription = await addEmailSubscription(email, reportType, cadence, {
      recipientName,
      recipientRole,
      entityId,
      notes,
    })

    return NextResponse.json(
      {
        success: true,
        data: subscription,
        message: `Email subscription added for ${email}`,
      },
      { status: 201 }
    )
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('[subscriptions] POST failed:', message)

    // Handle unique constraint violations
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json(
        { error: 'This email is already subscribed to this report type' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add subscription', details: message },
      { status: 500 }
    )
  }
}
