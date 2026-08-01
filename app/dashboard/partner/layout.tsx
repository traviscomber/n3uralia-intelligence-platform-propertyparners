import { requirePageCapability } from '@/lib/access-guards'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requirePageCapability('dashboard.self.read')
  return children
}
