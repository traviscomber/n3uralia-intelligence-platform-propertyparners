import type { ReactNode } from 'react'

type PublicErrorNoticeProps = {
  title?: string
  message: string
  action?: ReactNode
  compact?: boolean
}

export function PublicErrorNotice({
  title = 'Información temporalmente no disponible',
  message,
  action,
  compact = false,
}: PublicErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={`border border-[var(--destructive)] bg-[#160d0c] text-[var(--n3-text-light)] ${compact ? 'p-4' : 'p-5'}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-5 text-[var(--n3-text-muted)]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
