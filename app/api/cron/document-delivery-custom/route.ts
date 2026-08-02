import { NextRequest, NextResponse } from 'next/server'
import { sendDocumentEmail, markDocumentAsSent, markDocumentAsFailed } from '@/lib/document-delivery'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

export async function POST(req: NextRequest) {
  try {
    // Verify authorization header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body for period override and recipient
    const body = await req.json()
    const { period, recipient_email } = body

    if (!period) {
      return NextResponse.json({ error: 'Period (YYYY-MM format) is required' }, { status: 400 })
    }

    if (!recipient_email) {
      return NextResponse.json({ error: 'recipient_email is required' }, { status: 400 })
    }

    // Create distribution entry for custom delivery
    // Generate a valid UUID v4 for schedule_id
    const scheduleId = 'c0287eca-885e-4bdc-8b60-135e4a1058e8' // Use fixed schedule UUID
    
    const { data: distribution, error: insertError } = await supabase
      .from('document_distributions')
      .insert({
        schedule_id: scheduleId,
        recipient_email,
        recipient_role: 'custom',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError || !distribution) {
      throw new Error(`Failed to create distribution: ${insertError?.message}`)
    }

    // Send the email with period override
    const resendResponse = await sendDocumentEmail(
      distribution.id,
      distribution.schedule_id,
      `Reporte Integral Ejecutivo - Property Partners ${period}`,
      '',
      recipient_email,
      period, // Pass period override
    )

    if (resendResponse.data?.id) {
      await markDocumentAsSent(distribution.id, resendResponse.data.id)
      return NextResponse.json({
        success: true,
        message: `Report for period ${period} sent to ${recipient_email}`,
        distribution_id: distribution.id,
        email_id: resendResponse.data.id,
      })
    } else {
      throw new Error('Failed to send email via Resend')
    }
  } catch (error) {
    console.error('[Custom Document Delivery] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
