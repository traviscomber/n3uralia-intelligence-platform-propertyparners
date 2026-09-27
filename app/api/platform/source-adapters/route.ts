import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { getRuntimeOperatingProfile } from '@/lib/platform/tenant-context'
import { resolveSourceAdapterState, sourceAdapterSummary } from '@/lib/platform/source-adapters'
import { createClient } from '@/lib/supabase/server'

const readCapabilities = [
  'market.read',
  'management.global.read',
  'management.office.read',
  'management.self.read',
] as const

export async function GET() {
  try {
    await requireAnyCapability(readCapabilities)
    const profile = getRuntimeOperatingProfile()
    if (!profile.features['source-adapter-registry']) {
      return NextResponse.json({ error: 'Source adapter registry disabled for this client.' }, { status: 404 })
    }

    const supabase = await createClient()
    const needsMarket = profile.sourceAdapters.some((item) => item.backend === 'market_sources')
    const needsData = profile.sourceAdapters.some((item) => item.backend === 'data_sources')
    const needsManagement = profile.sourceAdapters.some((item) => item.backend === 'management_source_records')

    const [marketResult, dataResult, managementResult] = await Promise.all([
      needsMarket
        ? supabase
            .from('market_sources')
            .select('source_type,status,row_count,imported_at')
            .order('imported_at', { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      needsData
        ? supabase
            .from('data_sources')
            .select('source_type,status,records_count,last_sync')
            .order('pipeline_order', { ascending: true })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      needsManagement
        ? supabase
            .from('management_source_records')
            .select('dataset,imported_at')
            .order('imported_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ])

    const failure = [marketResult, dataResult, managementResult].find((result) => result.error)
    if (failure?.error) {
      console.error('[platform-source-adapters] source lookup failed', { code: failure.error.code })
      return NextResponse.json({ error: 'No fue posible revisar el estado de las fuentes.' }, { status: 500 })
    }

    const sources = {
      market: marketResult.data ?? [],
      data: dataResult.data ?? [],
      management: managementResult.data ?? [],
    }
    const adapters = profile.sourceAdapters.map((adapter) => resolveSourceAdapterState(adapter, sources))

    return NextResponse.json({
      tenantId: profile.tenantId,
      adapters,
      summary: sourceAdapterSummary(adapters),
      generatedAt: new Date().toISOString(),
      refreshPolicy: 'read-only-registry; ingestion remains source-specific and explicitly governed',
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
