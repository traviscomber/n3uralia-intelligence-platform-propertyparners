import { requirePageCapability } from '@/lib/access-guards'

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  await requirePageCapability('dashboard.office.read')
  return children
}
