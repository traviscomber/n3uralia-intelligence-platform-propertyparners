import { requireAnyPageCapability } from '@/lib/access-guards'

export default async function ControlAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPageCapability(['management.global.manage', 'management.office.manage'])
  return children
}
