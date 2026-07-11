import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.redirect('/vitacura-sectors.kmz', {
    status: 307,
    headers: {
      'Content-Type': 'application/vnd.google-earth.kmz',
      'Content-Disposition': 'attachment; filename="vitacura-sectors.kmz"',
    },
  })
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.google-earth.kmz',
    },
  })
}
