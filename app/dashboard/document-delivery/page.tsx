import { requireCopilotRole } from '@/lib/copilot-authorization'
import DocumentDeliveryManager from '@/components/document-delivery-manager'

export const metadata = {
  title: 'Document Delivery - Property Partners Intelligence',
  description: 'Manage weekly and monthly document delivery schedules',
}

export default async function DocumentDeliveryPage() {
  await requireCopilotRole(['ceo', 'director'])

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Document Delivery</h1>
          <p className="mt-2 text-slate-600">
            Manage presentation delivery schedules for your team. Configure weekly and monthly
            distribution to CEO and directors.
          </p>
        </div>

        <DocumentDeliveryManager />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">How It Works</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                  1
                </span>
                <span>Create or upload a presentation document</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                  2
                </span>
                <span>Create a delivery schedule (weekly or monthly)</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                  3
                </span>
                <span>Select recipient roles (CEO, directors, etc.)</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                  4
                </span>
                <span>System automatically sends on schedule</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule Options</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-900">Weekly Delivery</h3>
                <p className="text-sm text-slate-600">
                  Send every week on a specific day (Monday, Tuesday, etc.)
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Monthly Delivery</h3>
                <p className="text-sm text-slate-600">
                  Send monthly on a specific date (1-28 of the month)
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Flexible Time</h3>
                <p className="text-sm text-slate-600">
                  Choose delivery time for each schedule
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
