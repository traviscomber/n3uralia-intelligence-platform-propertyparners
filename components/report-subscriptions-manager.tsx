'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
      <Card>
        <CardHeader>
          <CardTitle>Add Email Subscription</CardTitle>
          <CardDescription>Subscribe users to receive automated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSubscription} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Recipient Name (optional)</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Report Type</label>
                <Select value={reportType} onValueChange={setReportType} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cadence</label>
                <Select value={cadence} onValueChange={setCadence} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {message && (
              <div
                className={`p-3 rounded ${
                  message.includes('Failed') || message.includes('Error')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {message}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Subscription'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>{subscriptions.length} email subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={loadSubscriptions}
            disabled={loading}
            className="mb-4 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <div className="space-y-2">
            {subscriptions.length === 0 ? (
              <p className="text-gray-500 text-sm">No subscriptions yet</p>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 border rounded bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{sub.email}</p>
                    <p className="text-sm text-gray-600">
                      {sub.report_type} • {sub.cadence}
                      {sub.recipient_name && ` • ${sub.recipient_name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(sub.id, sub.active)}
                      disabled={loading}
                      className={`px-2 py-1 text-sm rounded ${
                        sub.active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {sub.active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      disabled={loading}
                      className="px-2 py-1 text-sm rounded bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
