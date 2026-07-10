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
    property: 'Propiedad',
    trend: 'Tendencia',
    comparable: 'Comparable',
    document: 'Documento',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Base de Conocimiento
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Acceso a reportes, estudios y análisis del mercado
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--n-fg-subtle)' }} />
          <input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded border text-sm"
            style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)', color: 'var(--n-fg)' }}
          />
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTag === null ? 'text-white' : ''
            }`}
            style={{
              background: selectedTag === null ? 'var(--n-primary)' : 'var(--n-border)',
              color: selectedTag === null ? 'white' : 'var(--n-fg-muted)',
            }}
          >
            Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: selectedTag === tag ? 'var(--n-primary)' : 'var(--n-border)',
                color: selectedTag === tag ? 'white' : 'var(--n-fg-muted)',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--n-fg-muted)' }}>
          Cargando documentos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="n-card p-12 text-center" style={{ color: 'var(--n-fg-muted)' }}>
          <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
          <p>No hay documentos que coincidan con tu búsqueda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="n-card p-4 n-card-hover cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--n-accent-muted)' }}>
                  <BookOpen size={18} style={{ color: 'var(--n-accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 style={{ color: 'var(--n-fg)' }} className="font-semibold text-sm">
                    {doc.title}
                  </h3>
                  <p style={{ color: 'var(--n-fg-muted)' }} className="text-xs mt-1 line-clamp-2">
                    {doc.content?.slice(0, 150)}...
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--n-border)', color: 'var(--n-fg-subtle)' }}>
                      {docTypeLabels[doc.doc_type] || doc.doc_type}
                    </span>
                    {doc.neighborhood && (
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--n-border)', color: 'var(--n-fg-subtle)' }}>
                        {doc.neighborhood}
                      </span>
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
