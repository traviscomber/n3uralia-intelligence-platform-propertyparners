import { NextResponse } from 'next/server'
import { createClient as createSupabaseAuthClient } from '@/lib/supabase/server'
import {
  buildFallbackValuationAnalysis,
  stripAccents,
  type ValuationAnalysis,
  type ValuationRequest,
} from '@/lib/valuation-ai'

export const dynamic = 'force-dynamic'

function asError(error: unknown, fallback: string) {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return new Error((error as { message: string }).message)
  }
  return new Error(fallback)
}

function clampText(value: string) {
  return stripAccents(value).replace(/\s+/g, ' ').trim()
}

function safeJsonParse(text: string) {
  const trimmed = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return null
  }
}

function sanitizeAnalysis(raw: Record<string, unknown>, fallback: ValuationAnalysis): ValuationAnalysis {
  const safeArray = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => clampText(String(item || ''))).filter(Boolean) : []

  const priceBands = Array.isArray(raw.price_bands)
    ? raw.price_bands
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const band = item as Record<string, unknown>
          const value = Number(band.value_uf)
          return Number.isFinite(value)
            ? {
                label: ['conservador', 'mercado', 'aspiracional', 'piso_negociacion'].includes(String(band.label))
                  ? (String(band.label) as ValuationAnalysis['price_bands'][number]['label'])
                  : 'mercado',
                value_uf: Math.round(value),
                note: clampText(String(band.note || '')),
              }
            : null
        })
        .filter(Boolean)
    : fallback.price_bands

  const sensitivities = Array.isArray(raw.sensitivities)
    ? raw.sensitivities
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const sensitivity = item as Record<string, unknown>
          const impact = Number(sensitivity.impact_uf)
          const direction = sensitivity.direction === 'down' ? 'down' : 'up'
          return Number.isFinite(impact)
            ? {
                factor: clampText(String(sensitivity.factor || 'Factor')),
                impact_uf: Math.round(Math.abs(impact)),
                direction,
                note: clampText(String(sensitivity.note || '')),
              }
            : null
        })
        .filter((item): item is ValuationAnalysis['sensitivities'][number] => Boolean(item))
    : fallback.sensitivities

  return {
    title: clampText(String(raw.title || fallback.title)),
    summary: clampText(String(raw.summary || fallback.summary)),
    market_position: clampText(String(raw.market_position || fallback.market_position)),
    why_now: safeArray(raw.why_now).slice(0, 4),
    risks: safeArray(raw.risks).slice(0, 4),
    actions: safeArray(raw.actions).slice(0, 4),
    confidence_note: clampText(String(raw.confidence_note || fallback.confidence_note)),
    band_recommendation: clampText(String(raw.band_recommendation || fallback.band_recommendation)),
    price_bands: (priceBands.length ? priceBands : fallback.price_bands).slice(0, 4) as ValuationAnalysis['price_bands'],
    sensitivities: (sensitivities.length ? sensitivities : fallback.sensitivities).slice(0, 5),
    source: 'openai',
  }
}

async function generateWithOpenAI(request: ValuationRequest, fallback: ValuationAnalysis) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallback

  const prompt = {
    market_scope: 'Vitacura',
    audience: 'Cotizador comercial de N3uralia',
    instruction:
      'Devuelve solo JSON valido, sin tildes ni markdown. No inventes datos. Enfocate en relato comercial para vender casas y departamentos en Vitacura.',
    request,
    desired_shape: {
      title: 'string',
      summary: 'string',
      market_position: 'string',
      why_now: ['string'],
      risks: ['string'],
      actions: ['string'],
      confidence_note: 'string',
      band_recommendation: 'string',
      price_bands: [
        { label: 'conservador', value_uf: 0, note: 'string' },
        { label: 'mercado', value_uf: 0, note: 'string' },
        { label: 'aspiracional', value_uf: 0, note: 'string' },
        { label: 'piso_negociacion', value_uf: 0, note: 'string' },
      ],
      sensitivities: [{ factor: 'string', impact_uf: 0, direction: 'up', note: 'string' }],
    },
  }

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
            'Eres un analista senior de N3uralia especializado en ventas de casas y departamentos en Vitacura. Prioriza precision comercial, foco ejecutivo y lenguaje simple. No uses tildes ni inventes datos. Devuelve solo JSON.',
        },
        {
          role: 'user',
          content: JSON.stringify(prompt, null, 2),
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

  return sanitizeAnalysis(parsed, fallback)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<ValuationRequest>
    if (!body.neighborhood || !body.estimated_uf || !Number.isFinite(body.estimated_uf)) {
      return NextResponse.json({ error: 'Faltan datos para analizar la valorizacion.' }, { status: 400 })
    }

    const authClient = await createSupabaseAuthClient()
    const generatedBy = (await authClient.auth.getUser()).data.user?.id || null
    const fallback = buildFallbackValuationAnalysis(body as ValuationRequest)
    const analysis = await generateWithOpenAI(body as ValuationRequest, fallback).catch((err) => {
      console.error('OpenAI valuation analysis failed, using fallback:', err)
      return fallback
    })

    const quotePayload = {
      quote_key: crypto.randomUUID(),
      created_by: generatedBy,
      neighborhood: body.neighborhood.name,
      area_m2: body.area_m2 || 0,
      bedrooms: body.bedrooms || 0,
      bathrooms: body.bathrooms || 0,
      age_years: body.age_years || 0,
      floor: body.floor || 0,
      condition: body.condition || 'bueno',
      has_parking: Boolean(body.has_parking),
      has_storage: Boolean(body.has_storage),
      has_pool: Boolean(body.has_pool),
      estimated_uf: body.estimated_uf,
      estimated_uf_m2: body.estimated_uf_m2 || 0,
      estimated_clp: body.estimated_clp || 0,
      confidence: body.confidence || 0,
      comparable_source: body.comparable_source || 'unknown',
      comparable_range_uf: body.comparable_range_uf || '',
      market_velocity: body.market_velocity || 0,
      market_absorption: body.market_absorption || 0,
      comparable_properties: body.comparable_properties || 0,
      publication_price_uf: analysis.price_bands.find((band) => band.label === 'aspiracional')?.value_uf || body.estimated_uf,
      closing_price_uf: analysis.price_bands.find((band) => band.label === 'mercado')?.value_uf || body.estimated_uf,
      negotiation_floor_uf: analysis.price_bands.find((band) => band.label === 'piso_negociacion')?.value_uf || body.estimated_uf,
      analysis,
      comparables: body.selected_comparables || [],
      benchmark: body.benchmark || null,
      market_context: {
        source: 'valorizador',
        market_scope: 'Vitacura',
      },
    }

    const { error: insertError } = await authClient
      .from('valuation_quotes')
      .insert(quotePayload)

    if (insertError) {
      console.error('Error persisting valuation quote:', insertError)
    }

    return NextResponse.json({
      analysis,
      quote_key: quotePayload.quote_key,
      generatedAt: new Date().toISOString(),
      source: analysis.source,
    })
  } catch (err) {
    console.error('Error generating valuation analysis:', err)
    return NextResponse.json(
      {
        error: asError(err, 'No pudimos generar el analisis del cotizador.').message,
      },
      { status: 500 },
    )
  }
}


