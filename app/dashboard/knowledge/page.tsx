'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Search, Filter } from 'lucide-react'

interface Document {
  id: string
  title: string
  content: string
  doc_type: string
  neighborhood?: string
  tags: string[]
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [filtered, setFiltered] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('knowledge_documents')
          .select('*')
          .order('created_at', { ascending: false })

        setDocs(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDocs()
  }, [])

  useEffect(() => {
    let result = docs

    if (searchTerm) {
      result = result.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.content?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedTag) {
      result = result.filter((doc) => doc.tags?.includes(selectedTag))
    }

    setFiltered(result)
  }, [docs, searchTerm, selectedTag])

  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags || [])))

  const docTypeLabels: { [key: string]: string } = {
    report: 'Reporte',
    market: 'Market',
    property: 'Casa',
    trend: 'Tendencia',
    comparable: 'Comparable',
    document: 'Documento',
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Base de Conocimiento</h1>
        <p className="text-sm text-gray-600 mt-2">Acceso a reportes, estudios y an·lisis del mercado de casas en Vitacura</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded border border-gray-300 bg-white text-gray-900 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTag === null ? '#8fb2aa text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTag === tag ? '#8fb2aa text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando documentos...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No hay documentos que coincidan con tu b√∫squeda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-cyan-300 cursor-pointer transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg #e8f3f0 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="#b89a7e" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900">{doc.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.content?.slice(0, 150)}...</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                      {docTypeLabels[doc.doc_type] || doc.doc_type}
                    </span>
                    {doc.neighborhood && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{doc.neighborhood}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

