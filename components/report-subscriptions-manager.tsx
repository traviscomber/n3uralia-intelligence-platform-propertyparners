'use client'

import { useState, useCallback } from 'react'

interface Subscription {
  id: string
  email: string
  report_type: string
  cadence: string
  active: boolean
  recipient_name?: string
}

const REPORT_TYPES = [
  { value: 'executive', label: 'Executive Report' },
  { value: 'office', label: 'Office Report' },
  { value: 'partner', label: 'Partner Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'cumulative', label: 'Cumulative Report' },
  { value: 'all', label: 'All Reports' },
]

const CADENCES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function ReportSubscriptionsManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [reportType, setReportType] = useState('executive')
  const [cadence, setCadence] = useState('monthly')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')

  // Load subscriptions on mount
  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.data)
      }
    } catch (err) {
      setMessage('Failed to load subscriptions')
    }
    setLoading(false)
  }, [])

  // Add new subscription
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reportType,
          cadence,
          recipientName: recipientName || undefined,
        }),
      })

      if (response.ok) {
        setMessage('Email subscription added successfully!')
        setEmail('')
        setRecipientName('')
        await loadSubscriptions()
      } else {
        const error = await response.json()
        setMessage(error.error || 'Failed to add subscription')
      }
    } catch (err) {
      setMessage('Error adding subscription')
    }
    setLoading(false)
  }

  // Delete subscription
  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage('Subscription deleted')
        await loadSubscriptions()
      } else {
        setMessage('Failed to delete subscription')
      }
    } catch (err) {
      setMessage('Error deleting subscription')
    }
    setLoading(false)
  }

  // Toggle active status
  const handleToggleActive = async (id: string, active: boolean) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })

      if (response.ok) {
        await loadSubscriptions()
      }
    } catch (err) {
      setMessage('Error updating subscription')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Add Subscription Card */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
        <h2 className="text-xl font-bold text-white mb-2">Add Email Subscription</h2>
        <p className="text-slate-400 text-sm mb-4">Subscribe users to receive automated reports</p>

        <form onSubmit={handleAddSubscription} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Recipient Name (optional)</label>
              <input
                type="text"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:border-blue-400"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cadence</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:border-blue-400"
              >
                {CADENCES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.includes('Failed') || message.includes('Error')
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-green-500/20 text-green-300 border border-green-500/30'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Adding...' : 'Add Subscription'}
          </button>
        </form>
      </div>

      {/* Subscriptions List Card */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 p-6">
        <h2 className="text-xl font-bold text-white mb-2">Active Subscriptions</h2>
        <p className="text-slate-400 text-sm mb-4">{subscriptions.length} email subscriptions</p>

        <button
          onClick={loadSubscriptions}
          disabled={loading}
          className="mb-4 px-3 py-2 text-sm bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>

        <div className="space-y-2">
          {subscriptions.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">No subscriptions yet</p>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 border border-slate-600 rounded bg-slate-600/50"
              >
                <div className="flex-1">
                  <p className="font-medium text-white">{sub.email}</p>
                  <p className="text-sm text-slate-400">
                    {sub.report_type} • {sub.cadence}
                    {sub.recipient_name && ` • ${sub.recipient_name}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(sub.id, sub.active)}
                    disabled={loading}
                    className={`px-2 py-1 text-sm rounded disabled:opacity-50 ${
                      sub.active
                        ? 'bg-green-600/50 text-green-300 hover:bg-green-600'
                        : 'bg-slate-500 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {sub.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDeleteSubscription(sub.id)}
                    disabled={loading}
                    className="px-2 py-1 text-sm rounded bg-red-600/50 text-red-300 hover:bg-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
