import type { ReactNode } from 'react'
import { getPublicErrorMessage, type PublicErrorCode } from '@/lib/public-error'

type PublicErrorNoticeProps = {
  title?: string
  code?: PublicErrorCode
  message?: string
  reference?: string | null
  action?: ReactNode
  compact?: boolean
}

export function PublicErrorNotice({
  title = 'Información temporalmente no disponible',
  code = 'DATA_UNAVAILABLE',
  message,
  reference,
  action,
  compact = false,
}: PublicErrorNoticeProps) {
  const publicMessage = message || getPublicErrorMessage(code)

  return (
    <div
      role="alert"
      className={`border border-[var(--destructive)] bg-[#160d0c] text-[var(--n3-text-light)] ${compact ? 'p-4' : 'p-5'}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-5 text-[var(--n3-text-muted)]">{publicMessage}</p>
      {reference ? (
        <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">
          Referencia del incidente: {reference}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
