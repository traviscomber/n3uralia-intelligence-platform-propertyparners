'use client'

import { useState } from 'react'
import { Send, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'

interface SendReportButtonProps {
  email?: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function SendCeoReportButton({ email, onSuccess, onError }: SendReportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [inputEmail, setInputEmail] = useState(email || '')
  const [showInput, setShowInput] = useState(!email)

  const handleSend = async () => {
    if (!inputEmail) {
      setStatus('error')
      setMessage('Por favor ingresa un email válido')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/management/send-ceo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No fue posible enviar el reporte')
      }

      setStatus('success')
      setMessage(`✓ Reporte enviado a ${inputEmail}`)
      setShowInput(false)
      onSuccess?.(data.message)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      setStatus('error')
      setMessage(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {showInput && (
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="tu@email.com"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            disabled={loading}
            className="flex-1 border border-[var(--n3-line)] bg-[#0c1111] px-3 py-2 text-sm placeholder-[var(--n3-text-muted)] focus:border-[#ff766f] focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex items-center gap-2 border border-[#ff766f] bg-[#ff766f]/10 px-4 py-2 text-sm font-semibold text-[#ff766f] hover:bg-[#ff766f]/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <Mail size={16} />
                Enviar
              </>
            )}
          </button>
        </div>
      )}

      {!showInput && status === 'idle' && (
        <button
          onClick={() => setShowInput(true)}
          className="flex w-full items-center justify-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] p-3 text-sm font-semibold text-[#ff766f] hover:border-[#ff766f]"
        >
          <Send size={16} />
          Descargar Reporte Integral
        </button>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 border border-[#2f8f4e] bg-[#2f8f4e]/10 p-3 text-sm text-[#65c780]">
          <CheckCircle2 size={16} />
          <div className="flex-1">
            <p>{message}</p>
            <button
              onClick={() => {
                setStatus('idle')
                setShowInput(true)
              }}
              className="mt-2 text-xs text-[#65c780] underline hover:no-underline"
            >
              Enviar a otro email
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 border border-[#d7332b] bg-[#d7332b]/10 p-3 text-sm text-[#ff766f]">
          <AlertCircle size={16} />
          <div className="flex-1">
            <p>{message}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-xs text-[#ff766f] underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
