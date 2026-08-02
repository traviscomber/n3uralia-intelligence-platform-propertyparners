import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const TOKEN = 'a3f7d9c21b6e4f0a8d5c7b2e91f640ab'
const MESSAGE_ID = 'd9cab98e-1bad-4b4f-8192-e85be788e877'

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('token') !== TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })
  }

  const response = await fetch(`https://api.resend.com/emails/${MESSAGE_ID}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)

  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    messageId: MESSAGE_ID,
    payload,
  }, { status: response.ok ? 200 : response.status, headers: { 'Cache-Control': 'no-store' } })
}
