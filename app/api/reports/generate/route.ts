import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { buildVitacuraNeighborhoodIntelligence, filterVitacuraRows, summarizeVitacuraNeighborhoods } from '@/lib/vitacura'

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
type StorageReportType = 'weekly_executive' | 'monthly_executive' | 'market'

type KpiSnapshot = {
  period_date: string
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  visitas_count?: number
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

type ProfileRow = {
  id: string
  full_name: string | null
  role: string
  team: string | null
  avatar_url: string | null
  created_at: string
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
  report_type: StorageReportType
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

type DirectorLeaderboardRow = {
  director_id: string
  director_name: string | null
  team: string | null
  sales_count: number
  commission_total: number
  conversion_rate: number
  latest_velocity: number
  target_gap: number
  status: 'on_track' | 'warning' | 'behind'
  trend: number
}

type ReportContext = {
  report_type: CanonicalReportType
  requested_report_type: ReportType
  title: string
  audience: string
  system_focus: string
  director_id: string | null
  team: string | null
  seller_id: string | null
  kpis: KpiSnapshot[]
  markets: MarketRow[]
  properties: PropertyRow[]
  profiles: ProfileRow[]
  director_leaderboard: DirectorLeaderboardRow[]
  selected_director: DirectorLeaderboardRow | null
  selected_profile: ProfileRow | null
  team_roster: ProfileRow[]
  available_properties: PropertyRow[]
  vitacura_neighborhood_insights: Array<{
    neighborhood: string
    commercialFocus: string
    watchout: string
    bestFor: string
  }>
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function asError(error: unknown, fallback: string) {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return new Error((error as { message: string }).message)
  }
  return new Error(fallback)
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

function storageReportType(reportType: ReportType): StorageReportType {
  switch (reportType) {
    case 'monthly_ceo':
      return 'monthly_executive'
    case 'seller_playbook':
    case 'market_brief':
    case 'captation_alert':
      return 'market'
    case 'ceo_brief':
    case 'director_accounts':
    case 'weekly_directors':
    default:
      return 'weekly_executive'
  }
}

function reportMeta(reportType: ReportType): ReportMeta {
  switch (canonicalReportType(reportType)) {
    case 'ceo_brief':
      return {
        title: 'Reporte Ejecutivo CEO',
        audience: 'CEO',
        systemFocus: 'Reporta negocio total, ranking de directores, brechas, riesgos y foco comercial por zona.',
      }
    case 'director_accounts':
      return {
        title: 'Reporte de Desempeno del Equipo Comercial',
        audience: 'Directores de venta',
        systemFocus: 'Reporta desempeno del equipo de ventas, roster, conversion, coaching y acciones por vendedor.',
      }
    case 'seller_playbook':
      return {
        title: 'Playbook Comercial de Vendedor',
        audience: 'Vendedores',
        systemFocus: 'Reporta prioridades diarias, propiedades activas, argumentos de cierre y seguimiento comercial.',
      }
    case 'market_brief':
      return {
        title: 'Lectura de Mercado',
        audience: 'Comercial',
        systemFocus: 'Reporta barrios, absorcion, inventario y oportunidad comercial.',
      }
    case 'captation_alert':
      return {
        title: 'Alerta de Captacion',
        audience: 'Comercial',
        systemFocus: 'Reporta captaciones, velocidad y casas con potencial inmediato.',
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

function normalizeTeam(value: string | null | undefined) {
  return clampText(value || '').toLowerCase()
}

function buildDirectorLeaderboard(kpis: KpiSnapshot[], profiles: ProfileRow[]): DirectorLeaderboardRow[] {
  const byDirector = new Map<string, KpiSnapshot[]>()
  const directorProfiles = new Map(
    profiles
      .filter((profile) => profile.role === 'director')
      .map((profile) => [profile.id, profile] as const),
  )

  for (const row of kpis) {
    if (!row.director_id) continue
    const list = byDirector.get(row.director_id) || []
    list.push(row)
    byDirector.set(row.director_id, list)
  }

  return [...byDirector.entries()]
    .map(([directorId, rows]) => {
      const latest = rows[0]
      const previous = rows[1]
      const targetGap = Math.max(0, (latest?.monthly_target || 0) - (latest?.ventas_count || 0))
      const status: DirectorLeaderboardRow['status'] = targetGap <= 0 ? 'on_track' : targetGap <= 2 ? 'warning' : 'behind'
      const conversionRate = rows.length
        ? Number((rows.reduce((sum, row) => sum + Number(row.conversion_rate || 0), 0) / rows.length).toFixed(1))
        : 0
      const directorProfile = directorProfiles.get(directorId) || null

      return {
        director_id: directorId,
        director_name: directorProfile?.full_name || null,
        team: directorProfile?.team || null,
        sales_count: rows.reduce((sum, row) => sum + Number(row.ventas_count || 0), 0),
        commission_total: rows.reduce((sum, row) => sum + Number(row.comision_total || 0), 0),
        conversion_rate: conversionRate,
        latest_velocity: latest?.velocidad_venta ?? 0,
        target_gap: targetGap,
        status,
        trend: latest && previous ? latest.ventas_count - previous.ventas_count : 0,
      }
    })
    .sort((a, b) => b.sales_count - a.sales_count)
}

function pickSelectedDirector(directorLeaderboard: DirectorLeaderboardRow[], directorId: string | null) {
  if (!directorId) return directorLeaderboard[0] || null
  return directorLeaderboard.find((row) => row.director_id === directorId) || null
}

function buildRoster(profiles: ProfileRow[], team: string | null, role: string) {
  const normalizedTeam = normalizeTeam(team)
  return profiles
    .filter((profile) => profile.role === role && (!normalizedTeam || normalizeTeam(profile.team) === normalizedTeam))
    .sort((a, b) => (a.full_name || a.id).localeCompare(b.full_name || b.id))
}

function buildAvailableProperties(properties: PropertyRow[]) {
  return properties
    .filter((property) => (property.status || '').toLowerCase() === 'available')
    .sort((a, b) => Number(b.price_uf || 0) - Number(a.price_uf || 0))
}

function buildRoleContext(
  reportType: ReportType,
  kpis: KpiSnapshot[],
  markets: MarketRow[],
  properties: PropertyRow[],
  profiles: ProfileRow[],
  directorId: string | null = null,
  team: string | null = null,
  sellerId: string | null = null,
) {
  const canonicalType = canonicalReportType(reportType)
  const latest = kpis[0]
  const previous = kpis[1]
  const vitacuraMarkets = filterVitacuraRows(markets)
  const vitacuraProperties = filterVitacuraRows(properties)
  const topMarket = vitacuraMarkets[0] || markets[0] || null
  const directorLeaderboard = buildDirectorLeaderboard(kpis, profiles)
  const selectedDirector = pickSelectedDirector(directorLeaderboard, directorId)
  const selectedDirectorProfile =
    (selectedDirector && profiles.find((profile) => profile.id === selectedDirector.director_id)) ||
    (directorId ? profiles.find((profile) => profile.id === directorId) || null : null)
  const selectedProfile = sellerId ? profiles.find((profile) => profile.id === sellerId) || null : null
  const selectedTeam = normalizeTeam(team || selectedProfile?.team || selectedDirectorProfile?.team || '')
  const teamRoster = buildRoster(profiles, selectedTeam || null, 'seller')
  const availableProperties = buildAvailableProperties(vitacuraProperties)
  const directorCount = profiles.filter((profile) => profile.role === 'director').length
  const sellerCount = profiles.filter((profile) => profile.role === 'seller').length
  const teamCount = new Set(profiles.map((profile) => normalizeTeam(profile.team)).filter(Boolean)).size
  const targetGap = Math.max(0, (latest?.monthly_target || 0) - (latest?.ventas_count || 0))
  const conversionDelta = latest && previous ? latest.conversion_rate - previous.conversion_rate : 0
  const strongestNeighborhood = topMarket?.neighborhood || 'Vitacura'
  const teamLabel = selectedTeam || selectedProfile?.team || selectedDirectorProfile?.team || 'Sin equipo'
  const sellerLabel = selectedProfile?.full_name || sellerId || 'equipo comercial'
  const vitacuraNeighborhoods = summarizeVitacuraNeighborhoods(vitacuraMarkets.length ? vitacuraMarkets : properties)
  const vitacuraNeighborhoodInsights = buildVitacuraNeighborhoodIntelligence(vitacuraMarkets.length ? vitacuraMarkets : properties)

  const topDirectors = directorLeaderboard.slice(0, 3).map((row) => ({
    director_id: row.director_id,
    director_name: row.director_name,
    team: row.team,
    sales_count: row.sales_count,
    commission_total: row.commission_total,
    conversion_rate: row.conversion_rate,
    latest_velocity: row.latest_velocity,
    target_gap: row.target_gap,
    status: row.status,
    trend: row.trend,
  }))
  const topDirector = directorLeaderboard[0] || null
  const worstDirector = directorLeaderboard[directorLeaderboard.length - 1] || null

  const roleByType: Record<CanonicalReportType, DeterministicBase> = {
    ceo_brief: {
      title: 'Reporte Ejecutivo CEO',
      audience: 'CEO',
      summary: `Cierre ejecutivo Vitacura con ${latest?.ventas_count ?? 0} ventas, ${latest?.captaciones_count ?? 0} captaciones y ${latest?.comision_total ?? 0} en comision. La lectura debe priorizar directores, equipos y barrios con mejor traccion. El gap objetivo es ${targetGap} y la prioridad es sostener crecimiento con foco en las mejores zonas de Vitacura.`,
      highlights: [
        'Mercado enfocado: Vitacura',
        `Barrios activos: ${vitacuraNeighborhoods.join(', ') || 'Sin dato'}`,
        `Ventas acumuladas: ${latest?.ventas_count ?? 0}`,
        `Comision total: ${latest?.comision_total ?? 0}`,
        `Conversion promedio: ${latest?.conversion_rate?.toFixed(1) ?? '0.0'}%`,
        `Directores activos: ${directorCount}`,
        `Sellers activos: ${sellerCount}`,
        `Barrio lider: ${strongestNeighborhood}`,
        vitacuraNeighborhoodInsights[0] ? `Lectura barrio: ${vitacuraNeighborhoodInsights[0].commercialFocus}` : 'Lectura barrio: Vitacura',
        topDirector ? `Director lider: ${topDirector.director_name || topDirector.director_id}` : 'Director lider: sin dato',
      ],
      risks: [
        targetGap > 0 ? `Gap objetivo de ${targetGap} ventas.` : 'Objetivo cubierto, sostener ritmo.',
        `Cambio de conversion de ${conversionDelta >= 0 ? '+' : ''}${conversionDelta.toFixed(1)} pts.`,
        topDirector ? `Director con mayor peso: ${topDirector.director_name || topDirector.director_id} (${topDirector.sales_count} ventas).` : 'No hay director lider estable en el corte actual.',
        worstDirector ? `Director con menor traccion: ${worstDirector.director_name || worstDirector.director_id} (${worstDirector.sales_count} ventas).` : 'No hay contraste de directores suficiente.',
      ],
      actions: [
        'Comparar directores por ventas, conversion, velocidad y brecha contra objetivo.',
        'Reforzar el seguimiento de los equipos con menor conversion o mayor gap.',
        'Sostener la lectura ejecutiva con foco en reasignacion de prioridades y recursos por barrio.',
      ],
      recommendation: 'Consolidar el foco en las zonas con mejor absorcion de Vitacura y mover recursos hacia los directores y equipos con mayor capacidad de cierre.',
      confidence: 0.91,
    },
    director_accounts: {
      title: 'Reporte de Desempeno del Equipo Comercial',
      audience: 'Directores de venta',
      summary: selectedDirector
        ? `Desempeno del equipo asociado al director ${selectedDirector.director_name || selectedDirector.director_id} con ${selectedDirector.sales_count} ventas acumuladas, ${selectedDirector.conversion_rate.toFixed(1)}% de conversion y ${selectedDirector.latest_velocity.toFixed(1)} dias de velocidad. El foco ahora debe ir al equipo, a sus vendedores y a la cartera que esta debajo de su control en Vitacura.`
        : `Lectura de desempeno del equipo comercial con ${latest?.ventas_count ?? 0} ventas, ${latest?.conversion_rate?.toFixed(1) ?? '0.0'}% de conversion y ${latest?.velocidad_venta ?? 0} dias de velocidad. El foco comercial debe ir a los vendedores y cuentas con mejor recorrido y mayor probabilidad de cierre en Vitacura.`,
      highlights: [
        `Equipo: ${teamLabel}`,
        `Vendedores activos: ${teamRoster.length || sellerCount}`,
        `Ventas de la semana: ${selectedDirector?.sales_count ?? latest?.ventas_count ?? 0}`,
        `Objetivo estimado: ${latest?.monthly_target ?? 0}`,
        `Velocidad comercial: ${selectedDirector?.latest_velocity ?? latest?.velocidad_venta ?? 0} dias`,
        `Brecha objetivo: ${selectedDirector?.target_gap ?? targetGap} ventas`,
        `Barrios de foco: ${vitacuraNeighborhoods.join(', ') || strongestNeighborhood}`,
        vitacuraNeighborhoodInsights[0] ? `Barrio clave: ${vitacuraNeighborhoodInsights[0].neighborhood}` : 'Barrio clave: Vitacura',
      ],
      risks: [
        `Brecha actual de ${selectedDirector?.target_gap ?? targetGap} ventas frente al objetivo.`,
        teamLabel === 'Sin equipo'
          ? 'Hay que normalizar la asignacion de team en profiles para leer el equipo sin ambiguedad.'
          : `Equipo identificado como ${teamLabel}.`,
        `${availableProperties.length} propiedades disponibles para activar seguimiento y cierres.`,
        selectedDirector?.director_name ? `Direccion a cargo de ${selectedDirector.director_name}.` : 'No hay director asignado en el corte actual.',
      ],
      actions: [
        'Priorizar vendedores con mejor traccion y revisar la cartera estancada del equipo.',
        'Alinear seguimiento de visitas, conversion y proxima accion por semana y por vendedor.',
        'Usar el resumen como base para la reunion de rendimiento comercial del director.',
      ],
      recommendation: 'Mantener una disciplina semanal de equipo, con coaching a vendedores y activacion de cartera antes de ampliar el pipeline en Vitacura.',
      confidence: 0.88,
    },
    seller_playbook: {
      title: 'Playbook Comercial de Vendedor',
      audience: 'Vendedores',
      summary: `${sellerLabel} debe trabajar desde ${teamLabel} con foco en ${availableProperties.length} casas activas y ${strongestNeighborhood} como barrio de mayor oportunidad en Vitacura. El playbook indica donde conviene insistir, que propiedades priorizar y donde acelerar seguimiento.`,
      highlights: [
        `Casas disponibles: ${availableProperties.length}`,
        `Barrio lider: ${topMarket?.neighborhood || 'Sin dato'}`,
        `Absorcion del barrio lider: ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}%`,
        `Equipo: ${teamLabel}`,
        `Barrios priorizados: ${vitacuraNeighborhoods.join(', ') || 'Vitacura'}`,
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
      recommendation: 'Trabajar el inventario con mayor potencial de Vitacura y sostener cadencia diaria de seguimiento para convertir mas rapido.',
      confidence: 0.86,
    },
    market_brief: {
      title: 'Lectura de Mercado',
      audience: 'Comercial',
      summary: `${topMarket?.neighborhood || 'Mercado'} lidera en Vitacura con ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}% de absorcion y ${topMarket?.inventory_count ?? 0} casas en inventario.`,
      highlights: [
        `Barrio lider: ${topMarket?.neighborhood || 'Sin dato'}`,
        `Absorcion: ${topMarket?.absorption_rate?.toFixed(1) ?? '0.0'}%`,
        `Inventario: ${topMarket?.inventory_count ?? 0} casas`,
        `Barrios observados: ${vitacuraNeighborhoods.join(', ') || 'Vitacura'}`,
        vitacuraNeighborhoodInsights[0] ? `Foco comercial: ${vitacuraNeighborhoodInsights[0].commercialFocus}` : 'Foco comercial: Vitacura',
      ],
      risks: ['Lectura concentrada en una sola zona si no se diversifica cobertura.'],
      actions: ['Cruzar barrios con mejor absorcion y ajustar foco comercial.'],
      recommendation: 'Usar el brief para ajustar posicionamiento y priorizar las zonas con mejor traccion en Vitacura.',
      confidence: 0.84,
    },
    captation_alert: {
      title: 'Alerta de Captacion',
      audience: 'Comercial',
      summary: `${availableProperties.length} casas siguen disponibles en Vitacura; prioriza captaciones en zonas con mejor absorcion y menor inventario.`,
      highlights: [
        `Propiedades disponibles: ${availableProperties.length}`,
        `Mejor barrio: ${topMarket?.neighborhood || 'Sin dato'}`,
        `Barrios a cubrir: ${vitacuraNeighborhoods.join(', ') || 'Vitacura'}`,
        vitacuraNeighborhoodInsights[0] ? `Mejor uso: ${vitacuraNeighborhoodInsights[0].bestFor}` : 'Mejor uso: Vitacura',
      ],
      risks: ['Si la captacion se retrasa, el inventario puede perder oportunidad comercial.'],
      actions: ['Activar seguimiento inmediato en las zonas con mejor absorcion y mejor margen de cierre.'],
      recommendation: 'Enfocar captacion sobre propiedades y barrios con mayor velocidad comercial dentro de Vitacura.',
      confidence: 0.83,
    },
  }

  return {
    canonicalType,
    latest,
    previous,
    topMarket,
    conversionDelta,
    targetGap,
    directorLeaderboard,
    selectedDirector,
    selectedProfile,
    selectedTeam: selectedTeam || null,
    teamRoster,
    availableProperties,
    directorCount,
    sellerCount,
    teamCount,
    strongestNeighborhood,
    vitacuraNeighborhoods,
    vitacuraNeighborhoodInsights,
    topDirectors,
    roleByType,
  }
}

function buildDeterministicPayload(reportType: ReportType, context: ReturnType<typeof buildRoleContext>) {
  const base = context.roleByType[context.canonicalType]

  return {
    title: base.title,
    summary: clampText(base.summary),
    content: {
      report_type: context.canonicalType,
      requested_report_type: reportType,
      audience: base.audience,
      market_scope: 'Vitacura',
      generated_mode: 'deterministic',
      highlights: base.highlights,
      risks: base.risks,
      actions: base.actions,
      recommendation: base.recommendation,
      confidence: base.confidence,
      audience_context: {
        director_id: context.selectedDirector?.director_id || null,
        team: context.selectedTeam,
        seller_id: context.selectedProfile?.id || null,
        director_leaderboard: context.topDirectors,
        vitacura_neighborhoods: context.vitacuraNeighborhoods,
        vitacura_neighborhood_insights: context.vitacuraNeighborhoodInsights,
        team_roster: context.teamRoster.map((profile) => ({
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          team: profile.team,
        })),
        available_properties: context.availableProperties.slice(0, 5).map((property) => ({
          id: property.id,
          neighborhood: property.neighborhood,
          price_uf: property.price_uf,
          area_m2: property.area_m2,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          status: property.status,
        })),
        market_leader: context.topMarket || null,
        vitacura_neighborhood_insights: context.vitacuraNeighborhoodInsights,
      },
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
          content: `Eres un analista inmobiliario senior de N3uralia. Genera un reporte comercial para ${audience}. ${systemFocus} No inventes datos de vendedor si no existen; usa la capa de equipo, cartera y mercado para inferir solo lo que el contexto soporte. Devuelve solo JSON valido con keys: title, summary, highlights, risks, actions, recommendation, confidence.`,
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
    const body = (await request.json().catch(() => ({}))) as {
      report_type?: ReportType
      director_id?: string | null
      team?: string | null
      seller_id?: string | null
    }

    const reportType = body.report_type || 'weekly_directors'
    const canonicalType = canonicalReportType(reportType)
    const storedType = storageReportType(reportType)
    const meta = reportMeta(reportType)

    const supabase = getServiceClient()
    const authClient = await createClient()
    const [
      { data: kpis, error: kpiError },
      { data: markets, error: marketError },
      { data: properties, error: propertyError },
      { data: profiles, error: profileError },
    ] = await Promise.all([
      supabase
        .from('kpi_snapshots')
        .select('period_date, ventas_count, ventas_uf, captaciones_count, visitas_count, leads_count, conversion_rate, comision_total, stock_count, velocidad_venta, monthly_target, director_id')
        .order('period_date', { ascending: false })
        .limit(12),
      supabase
        .from('market_data')
        .select('neighborhood, avg_price_uf, avg_price_m2_uf, absorption_rate, inventory_count')
        .order('absorption_rate', { ascending: false })
        .limit(10),
      supabase
        .from('properties')
        .select('id, neighborhood, price_uf, area_m2, bedrooms, bathrooms, status')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('profiles')
        .select('id, full_name, role, team, avatar_url, created_at')
        .limit(200),
    ])

    if (kpiError) throw asError(kpiError, 'Error consultando kpi_snapshots.')
    if (marketError) throw asError(marketError, 'Error consultando market_data.')
    if (propertyError) throw asError(propertyError, 'Error consultando properties.')
    if (profileError) throw asError(profileError, 'Error consultando profiles.')

    const kpiRows = (kpis || []) as KpiSnapshot[]
    const marketRows = (markets || []) as MarketRow[]
    const propertyRows = (properties || []) as PropertyRow[]
    const profileRows = (profiles || []) as ProfileRow[]
    const generatedBy = (await authClient.auth.getUser()).data.user?.id || null
    const context = buildRoleContext(reportType, kpiRows, marketRows, propertyRows, profileRows, body.director_id || null, body.team || null, body.seller_id || null)

    const payload: GeneratedReportPayload = await (async () => {
      try {
        const promptContext: ReportContext = {
          report_type: canonicalType,
          requested_report_type: reportType,
          title: meta.title,
          audience: meta.audience,
          system_focus: meta.systemFocus,
          director_id: body.director_id || context.selectedDirector?.director_id || null,
          team: body.team || context.selectedTeam,
          seller_id: body.seller_id || context.selectedProfile?.id || null,
          kpis: kpiRows,
          markets: marketRows,
          properties: propertyRows,
          profiles: profileRows,
          director_leaderboard: context.topDirectors,
          selected_director: context.selectedDirector,
          selected_profile: context.selectedProfile,
          team_roster: context.teamRoster,
          available_properties: context.availableProperties,
          vitacura_neighborhood_insights: context.vitacuraNeighborhoodInsights,
        }

        const modelOutput = await generateWithOpenAI(
          JSON.stringify(promptContext, null, 2),
          `${meta.systemFocus} El alcance es exclusivamente Vitacura y sus barrios.`,
          meta.audience,
        )
        if (modelOutput) {
          return {
            report_type: storedType,
            title: clampText(String(modelOutput.title || meta.title)),
            summary: clampText(String(modelOutput.summary || '')),
            content: {
              ...modelOutput,
              audience: meta.audience,
              market_scope: 'Vitacura',
              source: 'openai',
              requested_report_type: reportType,
              requested_audience: meta.audience,
              context: promptContext,
            },
            period_date: kpiRows[0]?.period_date || null,
            generated_by: generatedBy,
          }
        }
      } catch (err) {
        console.error('OpenAI generation failed, using fallback:', err)
      }

      const fallback = buildDeterministicPayload(reportType, context)
      return {
        report_type: storedType,
        title: fallback.title,
        summary: fallback.summary,
        content: {
          ...fallback.content,
          audience: meta.audience,
          market_scope: 'Vitacura',
          context: {
            report_type: canonicalType,
            requested_report_type: reportType,
            title: meta.title,
            audience: meta.audience,
            system_focus: meta.systemFocus,
            director_id: body.director_id || context.selectedDirector?.director_id || null,
            team: body.team || context.selectedTeam,
            seller_id: body.seller_id || context.selectedProfile?.id || null,
            vitacura_neighborhoods: context.vitacuraNeighborhoods,
            vitacura_neighborhood_insights: context.vitacuraNeighborhoodInsights,
          },
        },
        period_date: kpiRows[0]?.period_date || null,
        generated_by: generatedBy,
      }
    })()

    const { data: report, error: insertError } = await supabase
      .from('ai_reports')
      .insert({
        report_type: payload.report_type,
        title: payload.title,
        summary: payload.summary,
        content: payload.content,
        period_date: payload.period_date,
        generated_by: payload.generated_by,
      })
      .select('*')
      .single<AiReportRow>()

    if (insertError) throw asError(insertError, 'Error insertando ai_reports.')

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
      source: ((payload.content as Record<string, unknown>).generated_mode as string) || ((payload.content as Record<string, unknown>).source as string) || 'deterministic',
    })
  } catch (err) {
    console.error('Error generating AI report:', err)
    return NextResponse.json(
      {
        error: asError(err, 'No pudimos generar el reporte AI.').message,
      },
      { status: 500 },
    )
  }
}
