import { PedroPabloOperationalMemory } from '@/components/intelligence/pedro-pablo-operational-memory'
import { PedroPabloWorkspaceV2 } from '@/components/intelligence/pedro-pablo-workspace-v2'

export default function PedroPabloPage() {
  return <div className="space-y-8">
    <PedroPabloWorkspaceV2 />
    <PedroPabloOperationalMemory />
  </div>
}
