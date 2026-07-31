import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { hasCapability, type Capability } from '@/lib/access-control'
import {
  AuthenticationRequiredError,
  ProfileRequiredError,
  getUserScope,
  type UserScope,
} from '@/lib/user-scope'

export class AccessDeniedError extends Error {
  constructor(public readonly capability: Capability) {
    super(`Missing capability: ${capability}`)
    this.name = 'AccessDeniedError'
  }
}

export async function requireUserScope(): Promise<UserScope> {
  return getUserScope()
}

export async function requireCapability(capability: Capability): Promise<UserScope> {
  const scope = await getUserScope()
  if (!hasCapability(scope.role, capability)) throw new AccessDeniedError(capability)
  return scope
}

export async function requireAnyCapability(capabilities: readonly Capability[]): Promise<UserScope> {
  const scope = await getUserScope()
  if (!capabilities.some((capability) => hasCapability(scope.role, capability))) {
    throw new AccessDeniedError(capabilities[0])
  }
  return scope
}

export async function requirePageCapability(capability: Capability): Promise<UserScope> {
  try {
    return await requireCapability(capability)
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect('/auth/login')
    if (error instanceof ProfileRequiredError) redirect('/auth/login?error=profile')
    if (error instanceof AccessDeniedError) redirect('/dashboard?error=forbidden')
    throw error
  }
}

export async function requireAnyPageCapability(capabilities: readonly Capability[]): Promise<UserScope> {
  try {
    return await requireAnyCapability(capabilities)
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect('/auth/login')
    if (error instanceof ProfileRequiredError) redirect('/auth/login?error=profile')
    if (error instanceof AccessDeniedError) redirect('/dashboard?error=forbidden')
    throw error
  }
}

export function accessErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (error instanceof ProfileRequiredError) {
    return NextResponse.json({ error: 'Valid profile required' }, { status: 403 })
  }
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ error: 'Forbidden', capability: error.capability }, { status: 403 })
  }
  return NextResponse.json({ error: 'Internal access-control error' }, { status: 500 })
}

export function assertProfileVisible(scope: UserScope, profileId: string): void {
  if (!scope.visibleProfileIds.includes(profileId)) {
    throw new AccessDeniedError(
      scope.scope === 'global'
        ? 'management.global.read'
        : scope.scope === 'office'
          ? 'management.office.read'
          : 'management.self.read',
    )
  }
}

export function assertEntityVisible(scope: UserScope, entityId: string): void {
  if (!scope.visibleEntityIds.includes(entityId)) {
    throw new AccessDeniedError(
      scope.scope === 'global'
        ? 'management.global.read'
        : scope.scope === 'office'
          ? 'management.office.read'
          : 'management.self.read',
    )
  }
}
