import { CeoToday } from '@/components/management/ceo-today'
import { CeoIntelligenceGovernance } from '@/components/management/ceo-intelligence-governance'
import { CeoIntelligencePanel } from '@/components/management/ceo-intelligence-panel'

export default function CeoDashboard() {
  return (
    <>
      <CeoToday />
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8">
        <details className="mt-8 border-t border-[var(--n3-line)] pt-4">
          <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            Ver evidencia, metodología y gobernanza
          </summary>
          <div className="mt-6 space-y-8">
            <CeoIntelligencePanel />
            <CeoIntelligenceGovernance />
          </div>
        </details>
      </div>
    </>
  )
}
