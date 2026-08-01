import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReportType = 'executive' | 'office' | 'partner' | 'monthly' | 'cumulative' | 'all'
export type ReportCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'

export interface EmailSubscription {
  id: string
  email: string
  report_type: ReportType
  cadence: ReportCadence
  active: boolean
  recipient_name: string | null
  recipient_role: string | null
  entity_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EmailSubscriptionUpdate = {
  active?: boolean
  cadence?: ReportCadence
  recipientName?: string | null
  recipientRole?: string | null
  notes?: string | null
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
    createdBy?: string
  },
): Promise<EmailSubscription> {
  const supabase = createAdminClient()
  const payload = {
    email: email.toLowerCase().trim(),
    report_type: reportType,
    cadence,
    recipient_name: options?.recipientName ?? null,
    recipient_role: options?.recipientRole ?? null,
    entity_id: options?.entityId ?? null,
    notes: options?.notes ?? null,
    created_by: options?.createdBy ?? null,
    active: true,
  }

  const { data, error } = await supabase
    .from('report_email_subscriptions')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`Failed to add email subscription: ${error.message}`)
  return data as EmailSubscription
}

export async function getEmailSubscriptions(
  filters?: {
    reportType?: string
    entityId?: string
    active?: boolean
  },
): Promise<EmailSubscription[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('report_email_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.reportType) query = query.eq('report_type', filters.reportType)
  if (filters?.entityId) query = query.eq('entity_id', filters.entityId)
  if (filters?.active !== undefined) query = query.eq('active', filters.active)

  const { data, error } = await query
  if (error) throw new Error(`Failed to get subscriptions: ${error.message}`)
  return (data ?? []) as EmailSubscription[]
}

export async function updateEmailSubscription(
  id: string,
  updates: EmailSubscriptionUpdate,
): Promise<EmailSubscription> {
  const supabase = createAdminClient()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (updates.active !== undefined) payload.active = updates.active
  if (updates.cadence !== undefined) payload.cadence = updates.cadence
  if (updates.recipientName !== undefined) payload.recipient_name = updates.recipientName
  if (updates.recipientRole !== undefined) payload.recipient_role = updates.recipientRole
  if (updates.notes !== undefined) payload.notes = updates.notes

  const { data, error } = await supabase
    .from('report_email_subscriptions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update subscription: ${error.message}`)
  return data as EmailSubscription
}

export async function deleteEmailSubscription(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('report_email_subscriptions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Failed to deactivate subscription: ${error.message}`)
}

export async function getSubscribersForReport(
  reportType: string,
  entityId?: string,
): Promise<{ email: string; id: string; recipientName?: string }[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('report_email_subscriptions')
    .select('id,email,recipient_name')
    .eq('active', true)

  if (reportType !== 'all') query = query.or(`report_type.eq.${reportType},report_type.eq.all`)
  if (entityId) query = query.or(`entity_id.eq.${entityId},entity_id.is.null`)
  else query = query.is('entity_id', null)

  const { data, error } = await query
  if (error) throw new Error(`Failed to get subscribers: ${error.message}`)

  const unique = new Map<string, { email: string; id: string; recipientName?: string }>()
  for (const row of data ?? []) {
    const email = String(row.email ?? '').trim().toLowerCase()
    if (!email || unique.has(email)) continue
    unique.set(email, {
      id: row.id,
      email,
      recipientName: row.recipient_name || undefined,
    })
  }
  return [...unique.values()]
}

export async function logSubscriptionEvent(
  subscriptionId: string,
  eventType: 'sent' | 'failed' | 'acknowledged' | 'unsubscribed',
  details?: Record<string, unknown>,
  reportRunId?: string,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('report_subscription_events').insert({
    subscription_id: subscriptionId,
    report_run_id: reportRunId ?? null,
    event_type: eventType,
    details: details ?? {},
  })

  if (error) {
    console.error('[subscriptions] failed to log event', { message: error.message })
  }
}
