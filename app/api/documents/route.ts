import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    await requireCopilotRole(['ceo', 'director'])

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ documents })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    const statusCode = error instanceof Error && message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireCopilotRole(['ceo', 'director'])

    const body = await request.json()
    const { title, description, file_url, file_type } = body

    if (!title || !file_url || !file_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, file_url, file_type' },
        { status: 400 }
      )
    }

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        title,
        description,
        file_url,
        file_type,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
