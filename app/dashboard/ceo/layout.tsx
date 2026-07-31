import { requirePageCapability } from '@/lib/access-guards'

export default async function CeoLayout({ children }: { children: React.ReactNode }) {
  await requirePageCapability('dashboard.global.read')
  return children
}
