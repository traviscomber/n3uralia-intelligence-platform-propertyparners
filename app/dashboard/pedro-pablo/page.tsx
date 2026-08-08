import { PedroPabloPropertyContext } from '@/components/intelligence/pedro-pablo-property-context'
import { PedroPabloWorkspace } from '@/components/intelligence/pedro-pablo-workspace'

export default function PedroPabloPage() {
  return <div className="space-y-8">
    <PedroPabloWorkspace />
    <PedroPabloPropertyContext />
  </div>
}
