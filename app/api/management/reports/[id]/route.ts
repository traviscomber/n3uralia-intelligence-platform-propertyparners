import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const [{ data: report, error }, { data: distributions }] = await Promise.all([
    supabase.from('management_report_runs').select('*').eq('id', id).maybeSingle(),
    supabase.from('management_report_distributions').select('*').eq('report_run_id', id).order('created_at'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  return NextResponse.json({ report, distributions: distributions ?? [] })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!['admin','ceo','director','subdirector'].includes(String(profile?.role ?? '').toLowerCase())) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { id } = await params
  const body = await request.json().catch(() => null)
  const recipients = Array.isArray(body?.recipients) ? body.recipients.map(String).filter(Boolean) : []
  if (!recipients.length) return NextResponse.json({ error: 'Debe indicar al menos un destinatario.' }, { status: 400 })
  const rows = recipients.map((recipient: string) => ({ report_run_id: id, recipient, channel: body?.channel ?? 'manual', status: body?.status ?? 'pending', external_reference: body?.externalReference ?? null, sent_at: body?.status === 'sent' ? new Date().toISOString() : null }))
  const { data, error } = await supabase.from('management_report_distributions').upsert(rows, { onConflict: 'report_run_id,recipient,channel' }).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body?.status === 'sent') await supabase.from('management_report_runs').update({ status: 'distributed', distributed_at: new Date().toISOString(), distribution_reference: body?.externalReference ?? 'manual' }).eq('id', id)
  return NextResponse.json({ distributions: data ?? [] })
}
