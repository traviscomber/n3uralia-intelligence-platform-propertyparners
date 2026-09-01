import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchVitacuraPrcRows } from '@/lib/vitacura-prc'

export async function syncVitacuraPrc(admin: SupabaseClient) {
  const source = await fetchVitacuraPrcRows()
  const { data, error } = await admin.rpc('sync_vitacura_prc_bundle_v1', { p_rows: source.rows })

  if (error) {
    console.error('VITACURA_PRC_BUNDLE_SYNC_FAILED', { code: error.code ?? 'UNKNOWN' })
    throw new Error('VITACURA_PRC_BUNDLE_SYNC_FAILED')
  }

  return {
    source: 'Municipalidad de Vitacura · visor PRC vigente',
    officialViewer: source.officialViewer,
    sourceVersion: source.sourceVersion,
    sourceObservedAt: source.sourceObservedAt,
    diagnostics: source.diagnostics,
    database: data,
  }
}
