import 'server-only'

import { DEFAULT_TENANT_ID, getOperatingProfile } from '@/lib/platform/operating-profile'

export function getRuntimeTenantId() {
  return process.env.N3URALIA_TENANT_ID?.trim() || DEFAULT_TENANT_ID
}

export function getRuntimeOperatingProfile() {
  return getOperatingProfile(getRuntimeTenantId())
}
