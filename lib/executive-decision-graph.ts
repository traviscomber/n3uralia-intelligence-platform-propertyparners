import type { ExecutiveCase } from '@/lib/executive-cases'

export type ExecutiveDecisionGraphNode = {
  id: string
  label: string
  domain: string
  priority: ExecutiveCase['priority']
  readiness: ExecutiveCase['readiness']
  href: string
}

export type ExecutiveDecisionGraphEdge = {
  id: string
  from: string
  to: string
  type: 'shared_domain' | 'shared_evidence' | 'validation