export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function buildWhatsAppWebUrl(phone: string, message: string) {
  const normalizedPhone = normalizePhone(phone)
  const text = encodeURIComponent(message)
  return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${text}`
}

export function buildWeeklyReportMessage(params: {
  weekStart: string
  weekEnd: string
  salesCount: number
  commissionTotal: number
  conversionRate: number
  targetProgress: number
  topDirector?: string | null
  reportCount: number
}) {
  const topDirector = params.topDirector || 'sin director asignado'
  return [
    'Reporte semanal Property Partners',
    `Semana: ${params.weekStart} a ${params.weekEnd}`,
    `Ventas: ${params.salesCount}`,
    `Comision total: ${params.commissionTotal.toLocaleString('es-CL')} UF`,
    `Conversion: ${params.conversionRate.toFixed(1)}%`,
    `Cumplimiento objetivo: ${params.targetProgress}%`,
    `Director destacado: ${topDirector}`,
    `Snapshots disponibles: ${params.reportCount}`,
  ].join('\n')
}
