import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import AgentControlCenter from '@/components/agents/control-center'
import AgentExportsNotifications from '@/components/agents/exports-notifications'

export default function AgentsControlCenterPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/dashboard/agents/metrics" className="inline-flex items-center gap-2 rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-2.5 text-sm font-semibold text-[var(--n3-text-light)]">
          <BarChart3 className="h-4 w-4 text-[var(--n3-teal-soft)]" />
          Métricas y aprendizaje
        </Link>
      </div>
      <AgentControlCenter />
      <AgentExportsNotifications />
    </div>
  )
}
