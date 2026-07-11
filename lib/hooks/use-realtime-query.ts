'use client'

import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type QueryFn<T> = (supabase: SupabaseClient) => Promise<T[]>

type UseRealtimeQueryOptions = {
  table: string
  enabled?: boolean
  refreshIntervalMs?: number
}

export function useRealtimeQuery<T>(queryFn: QueryFn<T>, options: UseRealtimeQueryOptions) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(Boolean(options.enabled ?? true))
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const clientRef = useRef<SupabaseClient | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const queryFnRef = useRef(queryFn)

  queryFnRef.current = queryFn

  if (!clientRef.current) {
    clientRef.current = createClient()
  }

  const refresh = async () => {
    const supabase = clientRef.current
    if (!supabase || options.enabled === false) return

    try {
      setLoading(true)
      const rows = await queryFnRef.current(supabase)
      setData(rows)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const supabase = clientRef.current

    if (!supabase || options.enabled === false) {
      setLoading(false)
      return undefined
    }

    void (async () => {
      if (!active) return
      await refresh()
    })()

    if (options.table) {
      channelRef.current = supabase
        .channel(`realtime:${options.table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: options.table },
          () => {
            void refresh()
          },
        )
        .subscribe()
    }

    const intervalId = options.refreshIntervalMs
      ? window.setInterval(() => {
          void refresh()
        }, options.refreshIntervalMs)
      : null

    return () => {
      active = false
      if (intervalId) window.clearInterval(intervalId)
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [options.enabled, options.refreshIntervalMs, options.table])

  return { data, loading, error, lastUpdated, refresh }
}
