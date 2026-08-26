import { redirect } from 'next/navigation'
import { requireAnyPageCapability } from '@/lib/access-guards'

export default async function CanonicalManagementReportPage() {
  await requireAnyPageCapability(['management.global.read', 'reports.global.read'])
  redirect('/dashboard/reportes/canonicos')
}
