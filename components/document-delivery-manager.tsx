'use client'

import { useState, useEffect } from 'react'

interface Document {
  id: string
  title: string
  file_url: string
  file_type: string
  created_at: string
}

interface Schedule {
  id: string
  document_id: string
  title: string
  cadence: 'weekly' | 'monthly'
  day_of_week?: string
  day_of_month?: number
  send_time: string
  active: boolean
  next_send_at: string
  document_recipients?: Array<{ recipient_role: string }>
}

export default function DocumentDeliveryManager() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'schedules' | 'documents'>('schedules')

  // New schedule form
  const [newSchedule, setNewSchedule] = useState({
    document_id: '',
    title: '',
    description: '',
    cadence: 'weekly' as 'weekly' | 'monthly',
    day_of_week: 'monday',
    day_of_month: 1,
    send_time: '09:00',
    recipient_roles: ['ceo', 'director'] as string[],
  })

  // New document form
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [docsRes, schedulesRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/document-schedules'),
      ])

      if (docsRes.ok) {
        const { documents } = await docsRes.json()
        setDocuments(documents)
      }

      if (schedulesRes.ok) {
        const { schedules } = await schedulesRes.json()
        setSchedules(schedules)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()

    try {
      const response = await fetch('/api/document-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSchedule,
          send_time: `${newSchedule.send_time}:00`,
        }),
      })

      if (response.ok) {
        await fetchData()
        setNewSchedule({
          document_id: '',
          title: '',
          description: '',
          cadence: 'weekly',
          day_of_week: 'monday',
          day_of_month: 1,
          send_time: '09:00',
          recipient_roles: ['ceo', 'director'],
        })
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault()

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })

      if (response.ok) {
        await fetchData()
        setNewDocument({
          title: '',
          description: '',
          file_url: '',
          file_type: 'pdf',
        })
      }
    } catch (error) {
      console.error('Error creating document:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setTab('schedules')}
          className={`px-4 py-2 font-medium ${
            tab === 'schedules'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setTab('documents')}
          className={`px-4 py-2 font-medium ${
            tab === 'documents'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Documents
        </button>
      </div>

      {/* Schedules Tab */}
      {tab === 'schedules' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateSchedule} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Create New Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document</label>
                <select
                  value={newSchedule.document_id}
                  onChange={(e) => setNewSchedule({ ...newSchedule, document_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a document</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  placeholder="e.g., Weekly Executive Brief"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cadence</label>
                <select
                  value={newSchedule.cadence}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      cadence: e.target.value as 'weekly' | 'monthly',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {newSchedule.cadence === 'weekly' ? 'Day of Week' : 'Day of Month'}
                </label>
                {newSchedule.cadence === 'weekly' ? (
                  <select
                    value={newSchedule.day_of_week}
                    onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                      (day) => (
                        <option key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={newSchedule.day_of_month}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, day_of_month: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Send Time</label>
                <input
                  type="time"
                  value={newSchedule.send_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, send_time: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipients</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newSchedule.recipient_roles.includes('ceo')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewSchedule({
                            ...newSchedule,
                            recipient_roles: [...newSchedule.recipient_roles, 'ceo'],
                          })
                        } else {
                          setNewSchedule({
                            ...newSchedule,
                            recipient_roles: newSchedule.recipient_roles.filter((r) => r !== 'ceo'),
                          })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="ml-2 text-sm text-slate-600">CEO</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newSchedule.recipient_roles.includes('director')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewSchedule({
                            ...newSchedule,
                            recipient_roles: [...newSchedule.recipient_roles, 'director'],
                          })
                        } else {
                          setNewSchedule({
                            ...newSchedule,
                            recipient_roles: newSchedule.recipient_roles.filter((r) => r !== 'director'),
                          })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="ml-2 text-sm text-slate-600">Directors</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Schedule
            </button>
          </form>

          {/* Schedules List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Cadence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Next Send
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {schedule.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {schedule.cadence.charAt(0).toUpperCase() + schedule.cadence.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(schedule.next_send_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {schedule.document_recipients
                        ?.map((r) => r.recipient_role)
                        .join(', ')
                        .toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          schedule.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {schedule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateDocument} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload Document</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  placeholder="e.g., Executive Summary - Q3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File Type</label>
                <select
                  value={newDocument.file_type}
                  onChange={(e) => setNewDocument({ ...newDocument, file_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pdf">PDF</option>
                  <option value="pptx">PowerPoint</option>
                  <option value="xlsx">Excel</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">File URL</label>
                <input
                  type="url"
                  value={newDocument.file_url}
                  onChange={(e) => setNewDocument({ ...newDocument, file_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Upload Document
            </button>
          </form>

          {/* Documents List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-2">{doc.title}</h3>
                <p className="text-sm text-slate-600 mb-4">Type: {doc.file_type.toUpperCase()}</p>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Document →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
