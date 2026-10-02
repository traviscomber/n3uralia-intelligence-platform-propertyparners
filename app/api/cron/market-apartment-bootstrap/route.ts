import { GET as runMarketRefresh } from '@/app/api/cron/market-refresh/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const target = new URL('/api/cron/market-refresh', request.url)
  target.searchParams.set('details_only', '1')
  target.searchParams.set('dataset', 'portal_apartments')

  return runMarketRefresh(new Request(target, {
    method: 'GET',
    headers: request.headers,
  }))
}
