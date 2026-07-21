'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts'
import { TrendingUp, Home, DollarSign, Target, Users, Activity, Sparkles } from 'lucide-react'
import { buildHomeFallbackCards, buildLatestKpiFallback, buildOperationalSeries, getDataQuality, getOperationalSummary, getRoleActions, getYtdSummary } from '@/lib/crm-snapshot'

interface KPISnapshot {
  period_date: string
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  conversion_rate: number
  comision_total: number
  stock_count: number
  velocidad_venta: number
}

interface PropertyRow {
  id: string
  address: string
  neighborhood: string | null
  property_type: string | null
  description: string | null
  image_url: string | null
  source: string | null
  price_uf: number | null
  area_m2: number | null
  days_on_market: number | null
  created_at: string
}

export default function DashboardHome() {
    const [properties, setProperties] = useState<PropertyRow[]>([])
    const [loading, setLoading] = useState(true)
    const fallbackSummary = getOperationalSummary()
    const fallbackKpi = buildLatestKpiFallback()
    const quality = getDataQuality()
    const ytd = getYtdSummary()
    const ceoActions = getRoleActions('ceo')
    const fallbackChart = buildOperationalSeries(6).map(({ period_date, ventas, ventasUf, captaciones, leads, visitas, stock, conversion }) => ({
      id: `crm-${period_date}`,
      period_date,
      period_type: 'monthly' as const,
      ventas_count: ventas,
      ventas_uf: ventasUf,
      captaciones_count: captaciones,
      visitas_count: visitas,
      leads_count: leads,
      conversion_rate: conversion,
      comision_total: 0,
      stock_count: stock,
      velocidad_venta: 0,
      monthly_target: 0,
      director_id: null,
      agent_id: null,
      created_at: `${period_date}T00:00:00.000Z`,
    })) as KPISnapshot[]

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const supabase = createClient()
        const propertiesRes = await supabase
            .from('properties')
            .select('id,address,neighborhood,property_type,description,image_url,source,price_uf,area_m2,days_on_market,created_at')
            .order('created_at', { ascending: false })
            .limit(300)

        if (propertiesRes.error) throw propertiesRes.error
        setProperties((propertiesRes.data || []) as PropertyRow[])
      } catch (err) {
        console.error('Error fetching KPIs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  const latestKPI = fallbackKpi
  const previousKPI = fallbackChart.at(-2) ?? null
  const chartData = fallbackChart
  const propertyMetrics = useMemo(() => {
    const rows = properties.filter((property) => {
      const text = `${property.address || ''} ${property.neighborhood || ''} ${property.source || ''}`.toLowerCase()
      return text.includes('vitacura')
    })

    if (rows.length === 0) {
      return {
        hasLiveInventory: false,
        total: fallbackSummary.stock,
        withImage: 0,
        withDescription: 0,
        recent24h: 0,
        recent7d: 0,
        avgDays: 0,
        avgPricePerM2: 0,
        houseCount: 0,
        departmentCount: 0,
        sourceCount: fallbackSummary.topOrigins.length,
      }
    }

    const total = rows.length
    const withImage = rows.filter((property) => Boolean(property.image_url)).length
    const withDescription = rows.filter((property) => Boolean(property.description && property.description.trim())).length
    const recent24h = rows.filter((property) => Date.now() - new Date(property.created_at).getTime() <= 24 * 60 * 60 * 1000).length
    const recent7d = rows.filter((property) => Date.now() - new Date(property.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length
    const avgDays = total > 0 ? rows.reduce((sum, property) => sum + (property.days_on_market || 0), 0) / total : 0
    const avgPricePerM2 = total > 0
      ? rows.reduce((sum, property) => {
          const area = property.area_m2 && property.area_m2 > 0 ? property.area_m2 : 0
          const price = property.price_uf || 0
          return sum + (area > 0 ? price / area : 0)
        }, 0) / total
      : 0
    const houseCount = rows.filter((property) => (property.property_type || '').toLowerCase().includes('casa')).length
    const departmentCount = rows.filter((property) => (property.property_type || '').toLowerCase().includes('depart')).length

    return {
      hasLiveInventory: true,
      total,
      withImage,
      withDescription,
      recent24h,
      recent7d,
      avgDays,
      avgPricePerM2,
      houseCount,
      departmentCount,
      sourceCount: new Set(rows.map((property) => property.source).filter(Boolean)).size,
    }
  }, [properties])
  const imageCoverage = propertyMetrics.hasLiveInventory ? Math.round((propertyMetrics.withImage / propertyMetrics.total) * 100) : null
  const descriptionCoverage = propertyMetrics.hasLiveInventory ? Math.round((propertyMetrics.withDescription / propertyMetrics.total) * 100) : null
  const marketTone = !propertyMetrics.hasLiveInventory
    ? 'Sin inventario externo'
    : imageCoverage !== null && descriptionCoverage !== null && imageCoverage >= 90 && descriptionCoverage >= 90
      ? 'Cobertura fuerte'
      : imageCoverage !== null && descriptionCoverage !== null && imageCoverage >= 75 && descriptionCoverage >= 75
        ? 'Cobertura media'
        : 'Cobertura baja'
  const executiveScore = quality.sourceCoverage
  const salesDelta = latestKPI && previousKPI ? latestKPI.ventas_count - previousKPI.ventas_count : null
  const conversionDelta = latestKPI && previousKPI ? latestKPI.conversion_rate - previousKPI.conversion_rate : null

  const audienceCards = useMemo(() => {
    if (!propertyMetrics.hasLiveInventory) return buildHomeFallbackCards()

    const coverageSignal = imageCoverage !== null && descriptionCoverage !== null && imageCoverage >= 90 && descriptionCoverage >= 90
      ? 'Inventario muy sólido para lectura comercial'
      : imageCoverage !== null && descriptionCoverage !== null && imageCoverage >= 75 && descriptionCoverage >= 75
        ? 'Inventario utilizable, pero con huecos de calidad'
        : 'Inventario con huecos de calidad que requieren limpieza'

    return [
      {
        role: 'CEO',
        title: 'Panel ejecutivo',
        body: `${propertyMetrics.total} propiedades Vitacura, ${propertyMetrics.recent7d} recientes en 7 días y ${propertyMetrics.avgDays ? propertyMetrics.avgDays.toFixed(0) : '-'} días promedio en mercado.`,
        note: `Prioridad: ${coverageSignal}.`,
      },
      {
        role: 'Director',
        title: 'Gestión de equipo',
        body: `${propertyMetrics.sourceCount} fuentes activas, mix ${propertyMetrics.houseCount} casas / ${propertyMetrics.departmentCount} deptos y ${propertyMetrics.recent24h} entradas en 24h.`,
        note: 'Prioriza seguimiento, dedupe y redistribución de foco por barrio.',
      },
      {
        role: 'Vendedor',
        title: 'Lectura táctica',
        body: `Cobertura visual ${imageCoverage}% y descriptiva ${descriptionCoverage}%. Foco en fichas con mejor material para prospección.`,
        note: `Promedio ${propertyMetrics.avgPricePerM2 ? propertyMetrics.avgPricePerM2.toFixed(1) : '-'} UF/m².`,
      },
    ]
  }, [descriptionCoverage, imageCoverage, propertyMetrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#e5e7eb', borderTopColor: 'var(--n3-teal)' }}></div>
          <p style={{ color: '#6b7280' }}>Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="pb-6" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <h1 className="text-4xl font-bold text-gray-900">Ventas Vitacura</h1>
        <p className="mt-2" style={{ color: '#6b7280' }}>Inteligencia operativa y performance de ventas de casas y departamentos</p>
        <p className="text-xs mt-3" style={{ color: '#b9bfbc' }}>
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      {latestKPI && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Ventas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: 'var(--n3-teal)' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Ventas Vitacura</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.ventas_count}</p>
                <p className="text-xs mt-2" style={{ color: '#6b7280' }}>{fallbackSummary.monthLabel} · casas y departamentos</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: '#f9fafb', color: 'var(--n3-teal)' }}>
                <Home className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* UF Vendidas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: '#6b7280' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>UF Vendidas</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{(latestKPI.ventas_uf / 1000).toFixed(1)}K</p>
                <p className="text-xs mt-2" style={{ color: '#6b7280' }}>{fallbackSummary.monthLabel} · volumen validado</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: '#f9fafb', color: '#6b7280' }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Conversión Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: 'var(--n3-teal)' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cierres / leads nuevos</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.conversion_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">proxy mensual, no atribución de cohorte</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Stock Activo Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: '#f59e0b' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Activo</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.stock_count}</p>
                <p className="text-xs text-gray-500 mt-2">casas y departamentos disponibles</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white shadow-sm" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Control de cobertura y calidad</h2>
            <p className="mt-0.5 text-xs" style={{ color: '#6b7280' }}>Reglas, faltantes y exclusiones aplicadas antes de publicar los KPI</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f0f7f4', color: 'var(--n3-teal)' }}>{quality.sourceCoverage}% de fuentes</span>
        </div>
        <div className="grid md:grid-cols-2">
          {quality.issues.map((issue, index) => (
            <div key={issue.code} className="px-5 py-4" style={{ borderTop: index >= 2 ? '1px solid #f0f5f3' : undefined, borderRight: index % 2 === 0 ? '1px solid #f0f5f3' : undefined }}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: issue.severity === 'critical' ? '#dc2626' : issue.severity === 'warning' ? '#d97706' : 'var(--n3-teal)' }} />
                <h3 className="text-xs font-semibold text-gray-900">{issue.title}</h3>
              </div>
              <p className="mt-2 text-xs leading-5" style={{ color: '#6b7280' }}>{issue.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg p-6 border shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fbfa 100%)', borderColor: '#e5e7eb' }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Market intelligence Vitacura</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Inventario operativo de propiedades</h2>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}>
            {marketTone}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb', borderLeft: '3px solid var(--n3-teal)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Inventario</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{propertyMetrics.total}</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>{propertyMetrics.hasLiveInventory ? 'propiedades Vitacura visibles' : 'stock publicado en corte CRM'}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Nuevas 24h</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{propertyMetrics.hasLiveInventory ? propertyMetrics.recent24h : 'n/d'}</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>ingresos recientes</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Cobertura visual</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{imageCoverage === null ? 'n/d' : `${imageCoverage}%`}</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>fichas con imagen útil</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Cobertura descriptiva</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{descriptionCoverage === null ? 'n/d' : `${descriptionCoverage}%`}</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>fichas con descripcion</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Prom. días</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{propertyMetrics.avgDays ? propertyMetrics.avgDays.toFixed(0) : '-'}</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>tiempo en mercado</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>UF/m2</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{propertyMetrics.avgPricePerM2 ? propertyMetrics.avgPricePerM2.toFixed(1) : '-'}</p>
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>promedio Vitacura</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {audienceCards.map((card) => (
          <div key={card.role} className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{card.role}</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">{card.title}</h3>
              </div>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#f9fafb', color: 'var(--n3-teal)', border: '1px solid #e5e7eb' }}>
                Vitacura
              </span>
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: '#374151' }}>{card.body}</p>
            <p className="mt-3 text-xs" style={{ color: '#6b7280' }}>{card.note}</p>
          </div>
        ))}
      </div>

      {latestKPI && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Cobertura de fuentes</p>
                <h2 className="text-xl font-semibold mt-2" style={{ color: '#111111' }}>Control de calidad CRM</h2>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#f9fafb', color: 'var(--n3-teal)' }}>
                <Target className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-bold" style={{ color: '#111111' }}>
              {executiveScore === null ? 'n/d' : `${executiveScore}%`}
            </p>
            <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
              {salesDelta !== null ? `Ventas vs periodo previo: ${salesDelta >= 0 ? '+' : ''}${salesDelta}` : 'Sin comparación previa disponible'}
            </p>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
              {conversionDelta !== null ? `Proxy cierres/leads vs periodo previo: ${conversionDelta >= 0 ? '+' : ''}${conversionDelta.toFixed(1)} pts` : 'Sin variación previa disponible'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Lectura actual</p>
            <h2 className="text-xl font-semibold mt-2" style={{ color: '#111111' }}>Qué está pasando hoy</h2>
            <ul className="mt-4 space-y-3 text-sm" style={{ color: '#374151' }}>
              <li>• Ventas: {latestKPI.ventas_count} cierres validados por ID.</li>
              <li>• UF vendidas: {latestKPI.ventas_uf.toLocaleString('es-CL')}.</li>
              <li>• Captaciones: {latestKPI.captaciones_count} oportunidades nuevas en Vitacura.</li>
              <li>• Stock: {latestKPI.stock_count} propiedades en el inventario.</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Siguiente acción</p>
            <h2 className="text-xl font-semibold mt-2" style={{ color: '#111111' }}>Ir al centro de reportes</h2>
            <p className="mt-4 text-sm leading-6" style={{ color: '#374151' }}>
              Ahí quedan el scorecard, los reportes por audiencia, el aprendizaje IA y el seguimiento operativo del negocio.
            </p>
            <Link href="/dashboard/reportes" className="inline-flex mt-5 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold" style={{ background: '#111111', color: '#f9fafb' }}>
              <Sparkles className="w-4 h-4" />
              Abrir reportes
            </Link>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Tendencia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventas de casas y departamentos</h3>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--n3-teal)' }}></div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--n3-teal)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--n3-teal)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period_date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                cursor={{ stroke: 'var(--n3-teal)', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="ventas_count" stroke="var(--n3-teal)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" name="Ventas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

          {/* Tasa Conversión */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Proxy cierres / leads nuevos</h3>
            <div className="w-2 h-2 rounded-full" style={{ background: '#6b7280' }}></div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period_date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="conversion_rate" fill="#6b7280" name="Conversión %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="rounded-lg p-8 border-l-4 hover:shadow-md transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f9fafb 100%)', border: '1px solid #e5e7eb', borderLeftColor: 'var(--n3-teal)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-lg transition-transform duration-300 hover:scale-110" style={{ background: 'var(--n3-teal)' }}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Resumen Ejecutivo IA
              <span className="text-xs px-2 py-1 rounded-full font-semibold text-white" style={{ background: 'var(--n3-teal)' }}>Corte validado</span>
            </h3>
            <p className="mt-3 leading-relaxed" style={{ color: '#374151' }}>
              El corte enero-junio registra <span className="font-bold px-2 py-1 rounded" style={{ color: 'var(--n3-teal)', background: '#f9fafb' }}>{ytd.salesCount} ventas por UF {ytd.salesUf.toLocaleString('es-CL')}</span>.
              La cartera comparable cambió en {ytd.stockChange} propiedades y el último mes cerró con {latestKPI.stock_count} casas y departamentos publicados. Las metas 2026 están integradas desde sus libros fuente y las discrepancias de origen permanecen visibles.
            </p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(143, 178, 170, 0.2)' }}>
              <p className="text-xs font-semibold uppercase" style={{ color: 'var(--n3-teal)' }}>Próximas Acciones:</p>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: '#374151' }}>
                {ceoActions.map((item) => <li key={item.title}>• {item.action} Evidencia: {item.evidence}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f9fafb', border: '1px solid var(--n3-teal)', borderLeftColor: 'var(--n3-teal)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-teal)' }}>Captaciones</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.captaciones_count}</p>
          <p className="text-xs mt-2" style={{ color: '#374151' }}>oportunidades nuevas</p>
        </div>
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderLeftColor: '#6b7280' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Requerimientos</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{fallbackSummary.requirements}</p>
          <p className="text-xs mt-2" style={{ color: '#374151' }}>únicos y dentro de alcance</p>
        </div>
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f9fafb', border: '1px solid var(--n3-teal)', borderLeftColor: 'var(--n3-teal)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--n3-teal)' }}>Ticket mediano</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{fallbackSummary.medianSaleUf?.toLocaleString('es-CL') ?? 'n/d'} UF</p>
          <p className="text-xs mt-2" style={{ color: '#374151' }}>ventas del último corte</p>
        </div>
      </div>
    </div>
  )
}


