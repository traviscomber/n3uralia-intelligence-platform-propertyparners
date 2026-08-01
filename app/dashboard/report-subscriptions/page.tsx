import { Metadata } from 'next'
import { ReportSubscriptionsManager } from '@/components/report-subscriptions-manager'
import { requireCopilotRole } from '@/lib/copilot-authorization'

export const metadata: Metadata = {
  title: 'Email Subscriptions | Property Partners Intelligence',
  description: 'Manage automated email subscriptions for business intelligence reports',
}

export default async function ReportSubscriptionsPage() {
  // Protect this page - only CEO and directors can manage subscriptions
  await requireCopilotRole(['ceo', 'director'])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Email Subscriptions</h1>
          <p className="text-slate-400">
            Manage automated email delivery of reports to users and stakeholders
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <ReportSubscriptionsManager />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">How It Works</h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• Add user emails to receive reports</li>
              <li>• Select report type and delivery cadence</li>
              <li>• Reports send automatically on schedule</li>
              <li>• Track delivery events and status</li>
            </ul>
          </div>

          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-300 mb-2">Report Types</h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• Executive Reports</li>
              <li>• Office Reports</li>
              <li>• Partner Reports</li>
              <li>• Monthly & Cumulative</li>
            </ul>
          </div>

          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">Delivery Cadence</h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• Weekly</li>
              <li>• Bi-weekly</li>
              <li>• Monthly</li>
              <li>• Quarterly & Yearly</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-amber-900/30 border border-amber-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">📧 Email Configuration</h3>
          <p className="text-sm text-slate-300">
            Reports are sent from:{' '}
            <code className="bg-slate-900 px-2 py-1 rounded font-mono text-amber-200">
              Business Intelligence Property Partners &lt;info@ppartnersgroup.app&gt;
            </code>
          </p>
          <p className="text-xs text-slate-400 mt-2">
            With PDF attachments, automatic retries, and delivery tracking.
          </p>
        </div>
      </div>
    </main>
  )
}
