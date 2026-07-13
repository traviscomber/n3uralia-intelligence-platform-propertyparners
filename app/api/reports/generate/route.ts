import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ReportType =
  | 'ceo_brief'
  | 'director_accounts'
  | 'seller_playbook'
  | 'market_brief'
  | 'captation_alert'
  | 'weekly_directors'
  | 'monthly_ceo'

type CanonicalReportType = Exclude<ReportType, 'weekly_directors' | 'monthly_ceo'>

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
  report_type: CanonicalReportType
  title: string
  summary: string
  content: Record<string, unknown>
  period_date: string | null
  generated_by: string | null
}

type ReportMeta = {
  title: string
  audience: string
  systemFocus: string
}

type DeterministicBase = {
  title: string
  audience: string
  summary: string
  highlights: string[]
  risks: string[]
  actions: string[]
  recommendation: string
  confidence: number
}

function canonicalReportType(reportType: ReportType): CanonicalReportType {
  switch (reportType) {
    case 'weekly_directors':
      return 'director_accounts'
    case 'monthly_ceo':
      return 'ceo_brief'
    default:
      return reportType
  }
}

function reportMeta(reportType: ReportType): ReportMeta {
  switch (canonicalReportType(reportType)) {
    case 'ceo_brief':
      return {
        title: 'Reporte Ejecutivo CEO',
        audience: 'CEO',
        systemFocus: 'Prioriza decisiones de negocio, riesgos, crecimiento y sintesis para comite directivo.',
      }
    case 'director_accounts':
      return {
        title: 'Reporte de Directores de Cuenta',
        audience: 'Directores de cuenta',
        systemFocus: 'Prioriza performance por cuenta, metas, cartera y acciones semanales de seguimiento.',
      }
    case 'seller_playbook':
      return {
        title: 'Reporte Comercial de Vendedores',
        audience: 'Vendedores',
        systemFocus: 'Prioriza oportunidades concretas, propiedades en movimiento, seguimiento y acciones diarias.',
      }
    case 'market_brief':
      return {
        title: 'Lectura de Mercado',
        audience: 'Comercial',
        systemFocus: 'Prioriza barrios, absorcion, inventario y oportunidad comercial.',
      }
    case 'captation_alert':
      return {
        title: 'Alerta de Captacion',
        audience: 'Comercial',
        systemFocus: 'Prioriza captaciones, velocidad y casas con potencial inmediato.',
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
  const canonicalType = canonicalReportType(reportType)
  const latest = kpis[0]
  const previous = kpis[1]
  const topMarket = markets[0]
  const salesDelta = latest && previous ? latest.ventas_count - previous.ventas_count : 0
  const conversionDelta = latest && previous ? latest.conversion_rate - previous.conversion_rate : 0
  const weakestStock = properties.filter((property) => (property.status || '').toLowerCase() === 'available').length
  const targetGap = Math.max(0, (latest?.monthly_target || 0) - (latest?.ventas_count || 0))

  const baseByType: Record<CanonicalReportType, DeterministicBase> = {
    ceo_brief: {
      title: 'Reporte Ejecutivo CEO',
      audience: 'CEO',
      summary: `Cierre ejecutivo con ${latest?.ventas_count ?? 0} ventas, ${latest?.captaciones_count ?? 0} captaciones y ${latest?.comision_total ?? 0} en comision. El gap objetivo es ${targetGap} y la prioridad es sostener crecimiento con foco en las mejores zonas.`,
      highlights: [
        `Ventas acumuladas: ${latest?.ventas_count ?? 0}`,
        `Comision total: ${latest?.comision_total ?? 0}`,
        `Conversion promedio: ${latest?.conversion_rate?.toFixed(1) ?? '0.0'}%`,
      ],
      risks: [
        targetGap > 0 ? `Gap objetivo de ${targetGap} ventas.` : 'Objetivo cubierto, sostener ritmo.',
        `Cambio de conversion de ${conversionDelta >= 0 ? '+' : ''}${conversionDelta.toFixed(1)} pts.`,
      ],
      actions: [
        'Definir una prioridad comercial por barrio y mantener seguimiento semanal.',
        'Revisar desvíos en conversion y velocidad antes del corte siguiente.',
        'Sostener la lectura ejecutiva para reuniones con socios y directores.',
      ],
      recommendation: 'Consolidar el foco en las zonas con mejor absorcion y reforzar el seguimiento donde el gap aun es visible.',
      confidence: 0.91,
    },
    director_accounts: {
      title: 'Reporte de Directores de Cuenta',
      audience: 'Directores de cuenta',
      summary: `Lectura de cartera con ${latest?.ventas_count ?? 0} ventas, ${latest?.conversion_rate?.toFixed(1) ?? '0.0'}% de conversion y ${latest?.velocidad_venta ?? 0} dias de velocidad. El foco comercial debe ir a cuentas con mejor recorrido y mayor probabilidad de cierre.`,
      highlights: [
        `Ventas de la semana: ${latest?.ventas_count ?? 0}`,
        `Objetivo estimado: ${latest?.monthly_target ?? 0}`,
        `Velocidad comercial: ${latest?.velocidad_venta ?? 0} dias`,
      ],
      risks: [
        `Brecha actual de ${targetGap} ventas frente al objetivo.`,
        `Inventario disponible de ${weakestStock} propiedades para activar.`,
      ],
      actions: [
        'Priorizar cuentas con mejor traccion y revisar cartera estancada.',
        'Alinear seguimiento de visitas, conversion y proxima accion por director.',
        'Usar el resumen como base para la reunion semanal de cuentas.',
      ],
      recommendation: 'Mantener una disciplina semanal de cartera y activar cuentas con mejor absorcion antes de ampliar el pipeline.',
      confidence: 0.88,
    },
    seller_playbook: {
      title: 'Reporte Comercial de Vendedores',
      audience: 'Vendedores',
      summary: `${weakestStock} casas siguen disponibles y ${topMarket?.neighborhood || 'el mercado'} concentra la mejor oportunidad de movimiento. El reporte indica donde conviene insistir, que propiedades priorizar y donde acelerar seguimiento.`,
      highlights: [
        `Casas disponibles: ${weakestStock}`,
        `Barrio lider: ${topMarket?.neighborhood || 'Sin dato'}`,
        `Absorcion del barrio lider: ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}%`,
      ],
      risks: [
        'Demora en el seguimiento de propiedades con mayor potencial.',
        'Riesgo de dispersar esfuerzos en inventario de menor probabilidad de cierre.',
      ],
      actions: [
        'Contactar primero las propiedades y leads con mejor respuesta comercial.',
        'Actualizar seguimiento diario de visitas, objeciones y contraofertas.',
        'Usar el playbook para priorizar cierres y no solo volumen de actividad.',
      ],
      recommendation: 'Trabajar el inventario con mayor potencial y sostener cadencia diaria de seguimiento para convertir mas rapido.',
      confidence: 0.86,
    },
    market_brief: {
      title: 'Lectura de Mercado',
      audience: 'Comercial',
      summary: `${topMarket?.neighborhood || 'Mercado'} lidera con ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}% de absorcion y ${topMarket?.inventory_count ?? 0} casas en inventario.`,
      highlights: [
        `Barrio lider: ${topMarket?.neighborhood || 'Sin dato'}`,
        `Absorcion: ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}%`,
        `Inventario: ${topMarket?.inventory_count ?? 0} casas`,
      ],
      risks: ['Lectura concentrada en una sola zona si no se diversifica cobertura.'],
      actions: ['Cruzar barrios con mejor absorcion y ajustar foco comercial.'],
      recommendation: 'Usar el brief para ajustar posicionamiento y priorizar las zonas con mejor traccion.',
      confidence: 0.84,
    },
    captation_alert: {
      title: 'Alerta de Captacion',
      audience: 'Comercial',
      summary: `${weakestStock} casas siguen disponibles; prioriza captaciones en zonas con mejor absorcion y menor inventario.`,
      highlights: [
        `Propiedades disponibles: ${weakestStock}`,
        `Mejor barrio: ${topMarket?.neighborhood || 'Sin dato'}`,
      ],
      risks: ['Si la captacion se retrasa, el inventario puede perder oportunidad comercial.'],
      actions: ['Activar seguimiento inmediato en las zonas con mejor absorcion y mejor margen de cierre.'],
      recommendation: 'Enfocar captacion sobre propiedades y barrios con mayor velocidad comercial.',
      confidence: 0.83,
    },
  }

  const base = baseByType[canonicalType]

  return {
    title: base.title,
    summary: clampText(base.summary),
    content: {
      report_type: canonicalType,
      requested_report_type: reportType,
      audience: base.audience,
      generated_mode: 'deterministic',
      highlights: base.highlights,
      risks: base.risks,
      actions: base.actions,
      recommendation: base.recommendation,
      confidence: base.confidence,
      kpi_snapshot: latest || null,
      top_market: topMarket || null,
      available_properties: weakestStock,
      notes: ['Fallback utilizado porque OPENAI_API_KEY no esta disponible o el modelo fallo.'],
    },
  }
}

async function generateWithOpenAI(prompt: string, systemFocus: string, audience: string) {
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
          content: `Eres un analista inmobiliario senior de N3uralia. Genera un reporte comercial para ${audience}. ${systemFocus} Devuelve solo JSON valido con keys: title, summary, highlights, risks, actions, recommendation, confidence.`,
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
    const canonicalType = canonicalReportType(reportType)
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
      report_type: canonicalType,
      requested_report_type: reportType,
      title: meta.title,
      audience: meta.audience,
      system_focus: meta.systemFocus,
      kpis: kpiRows,
      markets: marketRows,
      properties: propertyRows,
    }

    let generated: GeneratedReportPayload | null = null

    try {
      const modelOutput = await generateWithOpenAI(JSON.stringify(context, null, 2), meta.systemFocus, meta.audience)
      if (modelOutput) {
        generated = {
          report_type: canonicalType,
          title: clampText(String(modelOutput.title || meta.title)),
          summary: clampText(String(modelOutput.summary || '')),
          content: {
            ...modelOutput,
            audience: meta.audience,
            source: 'openai',
            requested_report_type: reportType,
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
        report_type: canonicalType,
        title: fallback.title,
        summary: fallback.summary,
        content: {
          ...fallback.content,
          audience: meta.audience,
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
