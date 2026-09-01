'use client'

import { useFormStatus } from 'react-dom'

type PendingSubmitButtonProps = {
  idleLabel: string
  pendingLabel: string
  className?: string
}

export function PendingSubmitButton({ idleLabel, pendingLabel, className = '' }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-50`}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}
