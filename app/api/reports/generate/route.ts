import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ReportType = 'weekly_directors' | 'monthly_ceo' | 'market_brief' | 'captation_alert'

type KpiSnapshot = {
  period_date: string
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  visits_count?: number
  leads_count?: number
  conversion_rate: number
  comision_total: number
  stock_count: number
  velocidad_venta: number | null
  monthly_target: number | null
  director_id: string | null
}

type MarketRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
}

type PropertyRow = {
  id: string
  neighborhood: string | null
  price_uf: number | null
  area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  status: string | null
}

type AiReportRow = {
  id: string
  report_type: string
  title: string
  summary: string | null
  content: Record<string, unknown> | null
  period_date: string | null
  generated_by: string | null
  created_at: string
}

type GeneratedReportPayload = {
  report_type: ReportType
  title: string
  summary: string
  content: Record<string, unknown>
  period_date: string | null
  generated_by: string | null
}

function reportMeta(reportType: ReportType) {
  switch (reportType) {
    case 'monthly_ceo':
      return {
        title: 'Monthly CEO Brief',
        systemFocus: 'Prioriza lectura ejecutiva, riesgos y decisiones de negocio.',
      }
    case 'market_brief':
      return {
        title: 'Market Brief',
        systemFocus: 'Prioriza barrios, absorción, inventario y oportunidad comercial.',
      }
    case 'captation_alert':
      return {
        title: 'Captation Alert',
        systemFocus: 'Prioriza captaciones, velocidad y propiedades con potencial inmediato.',
      }
    case 'weekly_directors':
    default:
      return {
        title: 'Weekly Director Report',
        systemFocus: 'Prioriza performance por director, metas y acciones semanales.',
      }
  }
}

function clampText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function safeJsonParse(text: string) {
  const trimmed = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return null
  }
}

function deterministicSummary(reportType: ReportType, kpis: KpiSnapshot[], markets: MarketRow[], properties: PropertyRow[]) {
  const latest = kpis[0]
  const previous = kpis[1]
  const topMarket = markets[0]
  const salesDelta = latest && previous ? latest.ventas_count - previous.ventas_count : 0
  const conversionDelta = latest && previous ? latest.conversion_rate - previous.conversion_rate : 0
  const weakestStock = properties.filter((property) => (property.status || '').toLowerCase() === 'available').length
  const targetGap = Math.max(0, (latest?.monthly_target || 0) - (latest?.ventas_count || 0))

  const base = {
    weekly_directors: {
      title: 'Weekly Director Report',
      summary: `Ventas ${latest?.ventas_count ?? 0}, variación ${salesDelta >= 0 ? '+' : ''}${salesDelta}, conversión ${latest?.conversion_rate?.toFixed(1) ?? '0.0'}% y gap objetivo ${targetGap}.`,
    },
    monthly_ceo: {
      title: 'Monthly CEO Brief',
      summary: `Cierre ejecutivo con ${latest?.ventas_count ?? 0} ventas, ${latest?.captaciones_count ?? 0} captaciones y ${latest?.comision_total ?? 0} en comisión. La conversión cambió ${conversionDelta >= 0 ? '+' : ''}${conversionDelta.toFixed(1)} pts.`,
    },
    market_brief: {
      title: 'Market Brief',
      summary: `${topMarket?.neighborhood || 'Mercado'} lidera con ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}% de absorción y ${topMarket?.inventory_count ?? 0} propiedades en inventario.`,
    },
    captation_alert: {
      title: 'Captation Alert',
      summary: `${weakestStock} propiedades siguen disponibles; prioriza captaciones en zonas con mejor absorción y menor inventario.`,
    },
  }[reportType]

  return {
    title: base.title,
    summary: clampText(base.summary),
    content: {
      report_type: reportType,
      generated_mode: 'deterministic',
      kpi_snapshot: latest || null,
      top_market: topMarket || null,
      available_properties: weakestStock,
      notes: [
        'Fallback utilizado porque OPENAI_API_KEY no esta disponible o el modelo fallo.',
      ],
    },
  }
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista inmobiliario senior. Devuelve solo JSON valido con keys: title, summary, highlights, risks, actions, recommendation, confidence.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenAI request failed (${response.status}): ${errorText || response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI response was empty.')
  }

  const parsed = safeJsonParse(content)
  if (!parsed) {
    throw new Error('OpenAI response was not valid JSON.')
  }

  return parsed
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { report_type?: ReportType }
    const reportType = body.report_type || 'weekly_directors'
    const meta = reportMeta(reportType)

    const supabase = await createClient()
    const [{ data: kpis, error: kpiError }, { data: markets, error: marketError }, { data: properties, error: propertyError }] = await Promise.all([
      supabase
        .from('kpi_snapshots')
        .select('period_date, ventas_count, ventas_uf, captaciones_count, visits_count, leads_count, conversion_rate, comision_total, stock_count, velocidad_venta, monthly_target, director_id')
        .order('period_date', { ascending: false })
        .limit(6),
      supabase
        .from('market_data')
        .select('neighborhood, avg_price_uf, avg_price_m2_uf, absorption_rate, inventory_count')
        .order('absorption_rate', { ascending: false })
        .limit(10),
      supabase
        .from('properties')
        .select('id, neighborhood, price_uf, area_m2, bedrooms, bathrooms, status')
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    if (kpiError) throw kpiError
    if (marketError) throw marketError
    if (propertyError) throw propertyError

    const kpiRows = (kpis || []) as KpiSnapshot[]
    const marketRows = (markets || []) as MarketRow[]
    const propertyRows = (properties || []) as PropertyRow[]
    const latest = kpiRows[0] || null
    const generatedBy = (await supabase.auth.getUser()).data.user?.id || null

    const context = {
      report_type: reportType,
      title: meta.title,
      system_focus: meta.systemFocus,
      kpis: kpiRows,
      markets: marketRows,
      properties: propertyRows,
    }

    let generated: GeneratedReportPayload | null = null

    try {
      const modelOutput = await generateWithOpenAI(JSON.stringify(context, null, 2))
      if (modelOutput) {
        generated = {
          report_type: reportType,
          title: clampText(String(modelOutput.title || meta.title)),
          summary: clampText(String(modelOutput.summary || '')),
          content: {
            ...modelOutput,
            source: 'openai',
            context,
          },
          period_date: latest?.period_date || null,
          generated_by: generatedBy,
        }
      }
    } catch (err) {
      console.error('OpenAI generation failed, using fallback:', err)
    }

    if (!generated) {
      const fallback = deterministicSummary(reportType, kpiRows, marketRows, propertyRows)
      generated = {
        report_type: reportType,
        title: fallback.title,
        summary: fallback.summary,
        content: {
          ...fallback.content,
          context,
        },
        period_date: latest?.period_date || null,
        generated_by: generatedBy,
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('ai_reports')
      .insert({
        report_type: generated.report_type,
        title: generated.title,
        summary: generated.summary,
        content: generated.content,
        period_date: generated.period_date,
        generated_by: generated.generated_by,
      })
      .select('*')
      .single<AiReportRow>()

    if (insertError) throw insertError

    return NextResponse.json({
      report: inserted,
      generatedAt: new Date().toISOString(),
      source: generated.content.generated_mode || generated.content.source || 'deterministic',
    })
  } catch (err) {
    console.error('Error generating AI report:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'No pudimos generar el reporte AI.',
      },
      { status: 500 },
    )
  }
}
