import type { ReactNode } from 'react'
import { requirePageCapability } from '@/lib/access-guards'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requirePageCapability('settings.manage')
  return children
}
