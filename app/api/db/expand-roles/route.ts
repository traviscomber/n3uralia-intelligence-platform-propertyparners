import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST() {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const sqlPath = join(process.cwd(), 'supabase/migrations/20260712_roles_expansion.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    // Execute migration via rpc exec_sql if available, otherwise chunk manually
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      // Fallback: run key statements individually
      const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 10)
      const errors: string[] = []
      for (const stmt of stmts) {
        const { error: e } = await supabase.rpc('exec_sql', { sql: stmt })
        if (e) errors.push(e.message)
      }
      if (errors.length > 0 && errors.length === stmts.length) {
        return NextResponse.json({ error: 'Migration failed', details: errors.slice(0, 3) }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, message: 'Roles expansion migration completed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
