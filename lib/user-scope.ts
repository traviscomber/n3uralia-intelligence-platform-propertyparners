import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  createAccessContext,
  type AccessContext,
  type AccessScope,
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

async function visibleProfilesForScope(
  scope: AccessScope,
  profile: Profile,
): Promise<string[]> {
  if (scope === 'self') return [profile.id]

  const supabase = await createClient()
  let query = supabase.from('profiles').select('id')
  if (scope === 'office') {
    if (!profile.team) return [profile.id]
    query = query.eq('team', profile.team)
  }

  const { data, error } = await query
  if (error) throw new Error(`Unable to resolve visible profiles: ${error.message}`)
  return unique((data || []).map((row) => row.id))
}

async function visibleEntitiesForScope(
  scope: AccessScope,
  profile: Profile,
  entity: ManagementEntity | null,
  officeId: string | null,
): Promise<string[]> {
  const supabase = await createClient()

  if (scope === 'self') return unique([entity?.id])

  if (scope === 'global') {
    const { data, error } = await supabase.from('management_entities').select('id')
    if (error) throw new Error(`Unable to resolve visible entities: ${error.message}`)
    return unique((data || []).map((row) => row.id))
  }

  if (!officeId) return unique([entity?.id])

  const { data, error } = await supabase
    .from('management_entities')
    .select('id,parent_id')
    .or(`id.eq.${officeId},parent_id.eq.${officeId}`)

  if (error) throw new Error(`Unable to resolve office entities: ${error.message}`)
  return unique((data || []).flatMap((row) => [row.id, row.parent_id === officeId ? row.id : null]))
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

  const { data: rawEntity, error: entityError } = await supabase
    .from('management_entities')
    .select('id,name,profile_id,parent_id,metadata')
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (entityError) throw new Error(`Unable to resolve management entity: ${entityError.message}`)
  const entity = (rawEntity as ManagementEntity | null) || null

  let parent: ManagementEntity | null = null
  if (entity?.parent_id) {
    const { data, error } = await supabase
      .from('management_entities')
      .select('id,name,profile_id,parent_id,metadata')
      .eq('id', entity.parent_id)
      .maybeSingle()
    if (error) throw new Error(`Unable to resolve office entity: ${error.message}`)
    parent = (data as ManagementEntity | null) || null
  }

  const office = officeFromEntity(entity, parent)
  const [visibleProfileIds, visibleEntityIds] = await Promise.all([
    visibleProfilesForScope(access.scope, profile),
    visibleEntitiesForScope(access.scope, profile, entity, office.officeId),
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
