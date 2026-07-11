import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type MarketRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_data')
      .select('neighborhood, avg_price_uf, avg_price_m2_uf, absorption_rate, inventory_count')
      .order('absorption_rate', { ascending: false })

    if (error) throw error

    const rows = (data || []) as MarketRow[]
    const neighborhoods = rows.length
    const avgAbsorption = neighborhoods
      ? rows.reduce((sum, row) => sum + (row.absorption_rate || 0), 0) / neighborhoods
      : 0
    const avgPriceM2 = neighborhoods
      ? rows.reduce((sum, row) => sum + (row.avg_price_m2_uf || 0), 0) / neighborhoods
      : 0
    const totalInventory = rows.reduce((sum, row) => sum + (row.inventory_count || 0), 0)
    const hottest = rows[0] || null
    const slowest = rows[rows.length - 1] || null

    const insights = rows.map((row) => {
      const absorption = row.absorption_rate || 0
      const inventory = row.inventory_count || 0
      const price = row.avg_price_m2_uf || 0
      const opportunityScore = Math.round(
        clamp((absorption * 100) * 0.55 + (1 / Math.max(inventory, 1)) * 30 + (price ? 15 : 0), 0, 100),
      )

      const status = opportunityScore >= 70 ? 'hot' : opportunityScore >= 45 ? 'balanced' : 'slow'

      return {
        neighborhood: row.neighborhood,
        opportunity_score: opportunityScore,
        status,
        absorption_rate: absorption,
        inventory_count: inventory,
        avg_price_m2_uf: row.avg_price_m2_uf,
      }
    })

    return NextResponse.json({
      summary: {
        neighborhoods,
        avgAbsorption,
        avgPriceM2,
        totalInventory,
        hottest,
        slowest,
      },
      insights,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos calcular insights de mercado.' },
      { status: 500 },
    )
  }
}
