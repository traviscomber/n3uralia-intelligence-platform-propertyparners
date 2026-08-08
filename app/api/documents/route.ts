import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'

function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function parseLimit(raw: string | null) {
  const parsed = Number.parseInt(raw ?? '50', 10)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(parsed, 1), 100)
}

export async function GET(request: NextRequest) {
  const access = await requireCopilotRole(['ceo', 'director'])
  if (!access.ok) return access.response

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))

    const { data: documents, error } = await getSupabaseClient()
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Documents GET failed:', error instanceof Error ? error.name : 'unknown_error')
    return NextResponse.json({ error: 'No fue posible cargar los documentos.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCopilotRole(['ceo', 'director'])
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const { title, description, file_url, file_type } = body

    if (!title || !file_url || !file_type) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: title, file_url, file_type.' },
        { status: 400 },
      )
    }

    const { data: document, error } = await getSupabaseClient()
      .from('documents')
      .insert({
        title,
        description,
        file_url,
        file_type,
        created_by: access.value.userId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Documents POST failed:', error instanceof Error ? error.name : 'unknown_error')
    return NextResponse.json({ error: 'No fue posible crear el documento.' }, { status: 500 })
  }
}
