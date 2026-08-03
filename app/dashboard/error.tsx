'use client'

import { OperationalState } from '@/components/ui/operational-state'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl py-8">
      <OperationalState
        kind="error"
        title="No fue posible completar la vista"
        description="La operación falló antes de confirmar todos los datos requeridos. Puede reintentar sin perder la sesión."
        reference={error.digest ?? null}
      >
        <button
          type="button"
          onClick={reset}
          className="inline-flex border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold text-[var(--n3-text-light)] hover:border-[var(--n3-teal)]"
        >
          Reintentar
        </button>
      </OperationalState>
    </div>
  )
}
