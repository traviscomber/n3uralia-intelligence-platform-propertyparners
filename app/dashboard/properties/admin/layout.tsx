import { requireAnyPageCapability } from '@/lib/access-guards'

export default async function PropertyAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPageCapability(['properties.global.assign', 'properties.office.assign'])
  return children
}
