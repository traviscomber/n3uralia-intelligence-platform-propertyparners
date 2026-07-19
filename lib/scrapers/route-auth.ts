import { NextResponse } from 'next/server'

function getExpectedToken() {
  return process.env.APP_PASSWORD
    || process.env.NEXT_PUBLIC_APP_PASSWORD
    || process.env.SCRAPER_INTERNAL_KEY
    || null
}

function getIncomingToken(request: Request) {
  const header = request.headers.get('x-internal-key')
  if (header) return header.trim()

  const authorization = request.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }

  return null
}

export function validateScraperAccess(request: Request) {
  const expected = getExpectedToken()
  if (!expected) {
    return null
  }

  const incoming = getIncomingToken(request)
  if (incoming && incoming === expected) {
    return null
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
