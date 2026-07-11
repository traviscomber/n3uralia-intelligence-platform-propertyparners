'use client'

import { useEffect, useRef, useState } from 'react'
import type { KpiSnapshot } from '@/lib/types'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useKpiSnapshots(limit = 6) {
  const [data, setData] = useState<KpiSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const clientRef = useRef<SupabaseClient | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  if (!clientRef.current) {
    clientRef.current = createClient()
  }

  const refresh = async () => {
    const supabase = clientRef.current
    if (!supabase) return

    try {
      setLoading(true)
      const { data: rows, error: queryError } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .order('period_date', { ascending: false })
        .limit(limit)

      if (queryError) throw queryError
      setData((rows || []) as KpiSnapshot[])
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los KPIs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase = clientRef.current
    if (!supabase) return undefined

    void refresh()

    channelRef.current = supabase
      .channel('realtime:kpi_snapshots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_snapshots' }, () => {
        void refresh()
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [limit])

  return { data, loading, error, lastUpdated, refresh }
}
