import AgentControlCenter from '@/components/agents/control-center'
import AgentExportsNotifications from '@/components/agents/exports-notifications'

export default function AgentsControlCenterPage() {
  return (
    <div className="space-y-6">
      <AgentControlCenter />
      <AgentExportsNotifications />
    </div>
  )
}
