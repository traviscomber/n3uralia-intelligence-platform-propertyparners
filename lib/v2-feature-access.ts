export const V2_FEATURE_UNLOCK_EMAIL = 'juan@n3uralia.com'

export function canUnlockV2Features(user: { email?: string | null } | null | undefined): boolean {
  return user?.email?.trim().toLowerCase() === V2_FEATURE_UNLOCK_EMAIL
}
