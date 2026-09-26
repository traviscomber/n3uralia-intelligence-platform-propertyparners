import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  createAccessContext,
  type AccessContext,
} from '@/lib/access-control'
import type { Profile, UserRole } from '@/lib/types'

const VALID_ROLES = new Set<UserRole>(['ceo', 'admin', 'director', 'subdirector', 'seller'])

type ManagementEntity = {
  id: string
  name: string
  profile_id: string | null
  parent_id: string | null
  metadata: Record<string, unknown> | null
}

export type UserScope = AccessContext & {
  user: User
  profile: Profile
  officeId: string | null
  officeName: string | null
  entityId: string | null
  visibleEntityIds: string[]
  visibleProfileIds: string[]
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthenticationRequiredError'
  }
}

export class ProfileRequiredError extends Error {
  constructor() {
    super('A valid application profile is required')
    this.name = 'ProfileRequiredError'
  }
}

function normalizeRole(value: unknown): UserRole | null {
  const role = String(value || '').toLowerCase() as UserRole
  return VALID_ROLES.has(role) ? role : null
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function officeFromEntity(entity: ManagementEntity | null, parent: ManagementEntity | null) {
  if (!entity) return { officeId: null, officeName: null }
  if (parent) return { officeId: parent.id, officeName: parent.name }

  const metadata = entity.metadata || {}
  const type = String(metadata.type || metadata.entity_type || '').toLowerCase()
  if (type === 'office' || type === 'branch' || !entity.parent_id) {
    return { officeId: entity.id, officeName: entity.name }
  }

  return { officeId: entity.parent_id, officeName: null }
}

async function resolveVisibleProfileIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('current_user_visible_profile_ids')
  if (error) throw new Error(`Unable to resolve visible profiles: ${error.message}`)
  return unique((data || []).map((row: { profile_id: string }) => row.profile_id))
}

async function resolveVisibleEntityIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('current_user_visible_entity_ids')
  if (error) throw new Error(`Unable to resolve visible entities: ${error.message}`)
  return unique((data || []).map((row: { entity_id: string }) => row.entity_id))
}

export async function getUserScope(): Promise<UserScope> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new AuthenticationRequiredError()

  const { data: rawProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id,full_name,role,team,avatar_url,created_at')
    .eq('id', user.id)
    .maybeSingle()

  const role = normalizeRole(rawProfile?.role)
  if (profileError || !rawProfile || !role) throw new ProfileRequiredError()

  const profile: Profile = { ...rawProfile, role }
  const access = createAccessContext(profile)

  let entity: ManagementEntity | null = null
  let parent: ManagementEntity | null = null

  // Global roles do not need entity/office resolution for authorization.
  // Self scope is the authenticated profile itself, so avoid the expensive
  // current_user_visible_profile_ids() RPC entirely for sellers.
  if (access.scope !== 'global') {
    const { data: rawEntity, error: entityError } = await supabase
      .from('management_entities')
      .select('id,name,profile_id,parent_id,metadata')
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (entityError) throw new Error(`Unable to resolve management entity: ${entityError.message}`)
    entity = (rawEntity as ManagementEntity | null) || null

    if (entity?.parent_id) {
      const { data, error } = await supabase
        .from('management_entities')
        .select('id,name,profile_id,parent_id,metadata')
        .eq('id', entity.parent_id)
        .maybeSingle()
      if (error) throw new Error(`Unable to resolve office entity: ${error.message}`)
      parent = (data as ManagementEntity | null) || null
    }
  }

  const office = officeFromEntity(entity, parent)
  const [visibleProfileIds, visibleEntityIds] = await Promise.all([
    access.scope === 'self' ? Promise.resolve([profile.id]) : resolveVisibleProfileIds(),
    access.scope === 'global'
      ? Promise.resolve([])
      : access.scope === 'self'
        ? Promise.resolve(entity?.id ? [entity.id] : [])
        : resolveVisibleEntityIds(),
  ])

  return {
    ...access,
    user,
    profile,
    officeId: office.officeId,
    officeName: office.officeName || profile.team,
    entityId: entity?.id || null,
    visibleEntityIds,
    visibleProfileIds,
  }
}
