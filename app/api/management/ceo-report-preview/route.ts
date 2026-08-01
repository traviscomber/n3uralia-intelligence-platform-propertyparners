import { NextResponse } from 'next/server'
import { generateCeoReportHTML } from '@/lib/ceo-report-html-generator'
import { getCompanySalesCompliance, getBranchTargetPerformance } from '@/lib/targets-2026'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'
import { getOperationalSummary } from '@/lib/crm-snapshot'

export async function GET() {
  try {
    const now = new Date()
    const period = `2026-${String(now.getMonth() + 1).padStart(2, '0')}`

    const compliance = getCompanySalesCompliance(period)
    const branchPerformance = getBranchTargetPerformance(period)
    const operationalSummary = getOperationalSummary()
    const marketSnapshot = getMarketSnapshot()
    const valuationSnapshot = getValuationSnapshot()

    const compliance_percent = compliance.target && compliance.actual !== null ? ((compliance.actual / compliance.target) * 100).toFixed(1) : null
    const totalSales = operationalSummary?.sales || null
    const totalPartners = operationalSummary?.topAgents.length || 10
    const productivity = totalSales && totalPartners ? totalSales / totalPartners : null
    const branchesCount = branchPerformance.length || 4

    const reportData = {
      period,
      indicators: {
        compliance: compliance_percent ? Number(compliance_percent) : null,
        productivity: productivity ? Number(productivity.toFixed(2)) : null,
        marketSaturation: branchesCount > 0 ? `${branchesCount} oficinas activas` : 'n/d',
        conversionTrend: operationalSummary ? `${operationalSummary.leadToSaleProxy.toFixed(1)}:1 lead to sale ratio` : 'n/d',
        leadQuality: `${operationalSummary?.topAgents.length || 0} ejecutivas / ${marketSnapshot.length} señales de mercado`,
      },
      company: {
        sales: operationalSummary?.sales || null,
        salesUf: operationalSummary?.salesUf || null,
        cumulativeSales: operationalSummary?.sales || null,
        cumulativeSalesUf: operationalSummary?.salesUf || null,
        stock: operationalSummary?.stock || null,
        followUpScore: operationalSummary?.sourceCoverage || null,
        conversionScore: operationalSummary ? (operationalSummary.leadToSaleProxy ? 100 / operationalSummary.leadToSaleProxy : null) : null,
        targets: {
          salesMonthly: compliance.target || null,
          cumulativeTarget: null,
        },
        yoy: {
          sales: null,
          salesUf: null,
          cumulative: null,
        },
      },
      market: {
        zones: marketSnapshot
          .filter((m) => m.type === 'market_signal')
          .slice(0, 4)
          .map((signal) => ({
            name: signal.domain,
            signal: signal.title,
            trend: signal.summary,
            confidence: signal.confidence === 'high' ? '85' : signal.confidence === 'medium' ? '65' : '45',
          })),
        portfolio: `Portfolio de ${marketSnapshot.length} señales monitoreadas`,
      },
      valuation: {
        methodology: valuationSnapshot.length > 0 ? 'Deterministic with comparable analysis' : 'n/d',
        propertyTypes: ['Departamento', 'Casa', 'Terreno', 'Comercial'],
        models: valuationSnapshot.filter((v) => v.type === 'valuation_model').length + ' modelos disponibles',
      },
      risks: [
        {
          severity: 'critical',
          title: 'Cumplimiento bajo',
          description: 'Performance vs target < 80%',
          action: 'Implementar plan de recovery inmediato',
        },
        {
          severity: 'high',
          title: 'Productividad subóptima',
          description: 'Ratio operacional por debajo de benchmark',
          action: 'Revisar asignación de ejecutivas y cartera',
        },
        {
          severity: 'medium',
          title: 'Datos incompletos',
          description: 'Algunas métricas con información limitada',
          action: 'Validar fuentes y completar datos faltantes',
        },
      ],
      opportunities: [
        {
          priority: 'high',
          title: 'Expansión geográfica',
          description: 'Nuevas zonas con potencial de mercado',
          action: 'Evaluar apertura de sucursales en zonas de demanda',
        },
        {
          priority: 'medium',
          title: 'Optimización de conversión',
          description: 'Mejora en lead-to-sale ratio',
          action: 'Implementar training de follow-up y cierre',
        },
        {
          priority: 'medium',
          title: 'Mejora de productividad',
          description: 'Incrementar ventas por ejecutiva',
          action: 'Revisar procesos y optimizar herramientas',
        },
        {
          priority: 'low',
          title: 'Análisis de datos',
          description: 'Inteligencia competitiva más profunda',
          action: 'Implementar dashboard de mercado en tiempo real',
        },
      ],
    }

    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[CEO Report Preview] Error:', errorMsg)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMsg }, { status: 500 })
  }
}
