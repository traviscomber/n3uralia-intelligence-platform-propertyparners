import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/reports?type=weekly_executive&limit=20
export async function GET(req: NextRequest) {
  const supabase = getServiceClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '20')
  const id = searchParams.get('id')

  try {
    if (id) {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('id', id)
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json(data)
    }

    let query = supabase
      .from('ai_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('report_type', type)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reports: data, count: data?.length ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/reports — generate and store a new report
export async function POST(req: NextRequest) {
  const supabase = getServiceClient()

  try {
    const body = await req.json().catch(() => ({}))
    const reportType: string = body.report_type || 'weekly_executive'

    // Fetch latest KPI snapshot
    const { data: kpi, error: kpiErr } = await supabase
      .from('kpi_snapshots')
      .select('*')
      .order('period_date', { ascending: false })
      .limit(1)
      .single()

    if (kpiErr || !kpi) {
      return NextResponse.json(
        { error: 'No KPI data available. Add at least one kpi_snapshot row first.' },
        { status: 422 },
      )
    }

    // Fetch market data
    const { data: market } = await supabase
      .from('market_data')
      .select('neighborhood,avg_price_m2_uf,absorption_rate,avg_days_on_market,inventory_count')
      .order('absorption_rate', { ascending: false })

    const marketRows = market || []
    const topBarrio = marketRows[0]
    const avgPrice = marketRows.length
      ? (marketRows.reduce((s: number, m: any) => s + (m.avg_price_m2_uf || 0), 0) / marketRows.length).toFixed(1)
      : '—'

    const now = new Date()
    const periodDate = now.toISOString().split('T')[0]
    const dateLabel = now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

    const title =
      reportType === 'weekly_executive'
        ? `Reporte Ejecutivo Semanal — ${dateLabel}`
        : reportType === 'monthly_executive'
          ? `Reporte Ejecutivo Mensual — ${now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`
          : reportType === 'market'
            ? `Market Analysis Vitacura — ${dateLabel}`
            : `Reporte ${reportType} — ${dateLabel}`

    const summary = `Semana con ${kpi.ventas_count ?? 0} ventas (${(kpi.ventas_uf ?? 0).toLocaleString('es-CL')} UF) y tasa de conversión del ${(kpi.conversion_rate ?? 0).toFixed(1)}%. Mercado Vitacura con precio promedio ${avgPrice} UF/m². Barrio más activo: ${topBarrio?.neighborhood ?? '—'} (absorción ${((topBarrio?.absorption_rate ?? 0) * 100).toFixed(0)}%).`

    const content = {
      kpis: {
        ventas: kpi.ventas_count,
        ventas_uf: kpi.ventas_uf,
        captaciones: kpi.captaciones_count,
        conversion: kpi.conversion_rate,
        comision: kpi.comision_total,
        velocidad: kpi.velocidad_venta,
        stock: kpi.stock_count,
      },
      market_snapshot: marketRows.slice(0, 5).map((m: any) => ({
        barrio: m.neighborhood,
        uf_m2: m.avg_price_m2_uf,
        absorcion: m.absorption_rate,
        dias: m.avg_days_on_market,
      })),
      highlights: [
        `${kpi.ventas_count ?? 0} transacciones completadas esta semana`,
        `Velocidad promedio de venta: ${(kpi.velocidad_venta ?? 0).toFixed(0)} días`,
        `Stock activo: ${kpi.stock_count ?? 0} propiedades disponibles`,
        `Barrio con mayor absorción: ${topBarrio?.neighborhood ?? '—'} (${((topBarrio?.absorption_rate ?? 0) * 100).toFixed(0)}%)`,
        `Precio promedio mercado Vitacura: ${avgPrice} UF/m²`,
      ],
      generated_at: now.toISOString(),
      generated_by: 'api',
    }

    const { data: report, error: insertErr } = await supabase
      .from('ai_reports')
      .insert({ title, summary, report_type: reportType, period_date: periodDate, content })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    return NextResponse.json({ success: true, report }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/reports?id=<uuid>
export async function DELETE(req: NextRequest) {
  const supabase = getServiceClient()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase.from('ai_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, deleted_id: id })
}
