import { NextResponse } from 'next/server'
import { generateCeoReportHTML } from '@/lib/ceo-report-html-generator'
import { getCompanySalesCompliance, getBranchTargetPerformance } from '@/lib/targets-2026'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'
import { getOperationalSummary } from '@/lib/crm-snapshot'

// This is a public endpoint - no authentication required
// Used for PDF generation and email attachment
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    const now = new Date()
    const period = `2026-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Aggregate data
    const compliance = getCompanySalesCompliance(period)
    const branchPerformance = getBranchTargetPerformance(period)
    const operationalSummary = getOperationalSummary()
    const marketSnapshot = getMarketSnapshot()
    const valuationSnapshot = getValuationSnapshot()

    // Calculate indicators
    const compliance_percent = compliance.target && compliance.actual !== null ? ((compliance.actual / compliance.target) * 100).toFixed(1) : null
    const totalSales = operationalSummary?.sales || null
    const totalPartners = operationalSummary?.topAgents.length || 10
    const productivityValue = totalSales && totalPartners ? (totalSales / totalPartners).toFixed(2) : null
    const compliancePercent = compliance.target && totalSales ? ((totalSales / compliance.target) * 100).toFixed(1) : null

    const reportData = {
      period,
      indicators: {
        compliance: compliancePercent ? Number(compliancePercent) : null,
        productivity: productivityValue ? Number(productivityValue) : null,
        marketSaturation: 'Moderada',
        conversion: 'Estable',
        leadQuality: 'Media',
      },
      company: {
        sales: operationalSummary?.sales || null,
        salesUf: operationalSummary?.salesUf || null,
        cumulativeSales: operationalSummary?.sales || null,
        targets: {
          salesMonthly: compliance.target || null,
          cumulativeTarget: null,
        },
        productivity: productivityValue ? Number(productivityValue) : null,
        compliance: compliancePercent ? Number(compliancePercent) : null,
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
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[PDF Generation] Error:', errorMsg)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMsg }, { status: 500 })
  }
}
