import { requirePageCapability } from '@/lib/access-guards'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePageCapability('users.manage')
  return children
}
