import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface EmailSubscription {
  id: string
  email: string
  report_type: 'executive' | 'office' | 'partner' | 'monthly' | 'cumulative' | 'all'
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  active: boolean
  recipient_name?: string
  recipient_role?: string
  entity_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export async function addEmailSubscription(
  email: string,
  reportType: string,
  cadence: string,
  options?: {
    recipientName?: string
    recipientRole?: string
    entityId?: string
    notes?: string
  }
): Promise<EmailSubscription> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('report_email_subscriptions')
    .insert({
      email: email.toLowerCase().trim(),
      report_type: reportType,
      cadence,
      recipient_name: options?.recipientName,
      recipient_role: options?.recipientRole,
      entity_id: options?.entityId,
      notes: options?.notes,
      active: true,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add email subscription: ${error.message}`)
  return data
}

export async function getEmailSubscriptions(
  filters?: {
    reportType?: string
    entityId?: string
    active?: boolean
  }
): Promise<EmailSubscription[]> {
  const supabase = await createAdminClient()

  let query = supabase.from('report_email_subscriptions').select('*')

  if (filters?.reportType) {
    query = query.eq('report_type', filters.reportType)
  }

  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId)
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to get subscriptions: ${error.message}`)
  return data || []
}

export async function updateEmailSubscription(
  id: string,
  updates: Partial<EmailSubscription>
): Promise<EmailSubscription> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('report_email_subscriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update subscription: ${error.message}`)
  return data
}

export async function deleteEmailSubscription(id: string): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase.from('report_email_subscriptions').delete().eq('id', id)

  if (error) throw new Error(`Failed to delete subscription: ${error.message}`)
}

export async function getSubscribersForReport(
  reportType: string,
  entityId?: string
): Promise<{ email: string; id: string; recipientName?: string }[]> {
  const supabase = await createAdminClient()

  let query = supabase
    .from('report_email_subscriptions')
    .select('id, email, recipient_name')
    .eq('active', true)

  if (reportType === 'all') {
    // Match all report types
  } else {
    query = query.or(`report_type.eq.${reportType},report_type.eq.all`)
  }

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to get subscribers: ${error.message}`)

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    recipientName: row.recipient_name,
  }))
}

export async function logSubscriptionEvent(
  subscriptionId: string,
  eventType: 'sent' | 'failed' | 'acknowledged' | 'unsubscribed',
  details?: Record<string, unknown>,
  reportRunId?: string
): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase.from('report_subscription_events').insert({
    subscription_id: subscriptionId,
    report_run_id: reportRunId,
    event_type: eventType,
    details: details || {},
  })

  if (error) {
    console.error('[subscriptions] failed to log event:', error.message)
  }
}
