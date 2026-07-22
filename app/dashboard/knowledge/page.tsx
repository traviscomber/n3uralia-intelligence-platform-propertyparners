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
    market: 'Mercado',
    property: 'Casa',
    trend: 'Tendencia',
    comparable: 'Comparable',
    document: 'Documento',
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--n3-line)] pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">Repositorio interno</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--n3-text-light)]">Base de conocimiento</h1>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">Acceso a reportes, estudios y análisis del mercado de casas en Vitacura</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--n3-text-muted)]" />
          <input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-[var(--n3-line)] bg-[var(--n3-deep)] py-2 pl-10 pr-4 text-sm text-[var(--n3-text-light)] focus:border-[var(--n3-teal)]"
          />
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTag === null ? 'bg-[var(--n3-teal)] text-white' : 'border border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--n3-text-muted)]'
            }`}
          >
            Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTag === tag ? 'bg-[var(--n3-teal)] text-white' : 'border border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--n3-text-muted)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--n3-text-muted)]">Cargando documentos...</div>
      ) : filtered.length === 0 ? (
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-[var(--n3-text-muted)]" />
          <p className="text-[var(--n3-text-muted)]">No hay documentos que coincidan con tu busqueda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="cursor-pointer border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4 transition-colors hover:border-[var(--n3-teal)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--n3-line)] bg-black/20">
                  <BookOpen size={18} className="text-[var(--n3-text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-[var(--n3-text-light)]">{doc.title}</h3>
                  <p className="text-xs text-[var(--n3-text-muted)] mt-1 line-clamp-2">{doc.content?.slice(0, 150)}...</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--n3-black)] text-[var(--n3-text-muted)]">
                      {docTypeLabels[doc.doc_type] || doc.doc_type}
                    </span>
                    {doc.neighborhood && (
                      <span className="px-2 py-0.5 rounded text-xs bg-[var(--n3-black)] text-[var(--n3-text-muted)]">{doc.neighborhood}</span>
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
