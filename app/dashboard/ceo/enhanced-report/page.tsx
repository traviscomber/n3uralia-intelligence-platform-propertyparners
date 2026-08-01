'use client'

import { CeoEnhancedReport } from '@/components/management/ceo-enhanced-report'
import { SendCeoReportButton } from '@/components/management/send-ceo-report-button'

export default function CeoEnhancedReportPage() {
  return (
    <div className="space-y-6">
      <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <h2 className="mb-4 text-lg font-semibold">Descargar Reporte Integral</h2>
        <p className="mb-6 text-sm text-[var(--n3-text-muted)]">
          Envía automáticamente el reporte integral a tu email con todos los datos de mercado, indicadores de desempeño y análisis estratégico en formato HTML profesional.
        </p>
        <SendCeoReportButton />
      </div>
      <CeoEnhancedReport />
    </div>
  )
}
