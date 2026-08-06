import { requireCopilotRole } from '@/lib/copilot-authorization'
import DocumentDeliveryManager from '@/components/document-delivery-manager'

export const metadata = {
  title: 'Entregas programadas · Property Partners Intelligence',
  description: 'Control ejecutivo de documentos y entregas programadas',
}

export default async function DocumentDeliveryPage() {
  await requireCopilotRole(['ceo', 'admin', 'director', 'subdirector'])

  return <DocumentDeliveryManager />
}
