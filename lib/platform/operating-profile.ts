import type { UserRole } from '@/lib/types'

export type OperatingPillarId = 'management' | 'intelligence' | 'valuation'
export type OperatingFeatureId =
  | 'daily-work'
  | 'management'
  | 'market-intelligence'
  | 'portfolio'
  | 'valuation'
  | 'reports'
  | 'assistant'
  | 'action-gateway'
  | 'user-administration'
  | 'source-governance'
  | 'activity-feed'
  | 'attention-inbox'

export type NextActionCondition =
  | 'always'
  | 'has-portfolio'
  | 'no-portfolio'
  | 'has-portfolio-attention'
  | 'has-valuation-work'
  | 'no-valuation-work'
  | 'has-valuation-review'
  | 'no-valuation-review'
  | 'has-data-gaps'
  | 'market-available'

export type OperatingActionTemplate = {
  id: string
  title: string
  domain: 'management' | 'market' | 'portfolio' | 'valuation' | 'documents' | 'contacts' | 'administration'
  href: string
  condition: NextActionCondition
  priority: 'high' | 'medium' | 'low'
}

export type OperatingRoleProfile = {
  label: string
  scope: 'global' | 'office' | 'self'
  proactiveActions: OperatingActionTemplate[]
}

export type ValuationWorkflowStatus = 'draft' | 'review' | 'approved' | 'issued'
export type ConfirmedActionId = 'create_task'

export type OperatingProfile = {
  schemaVersion: 1
  tenantId: string
  clientName: string
  marketScope: string
  pillars: Array<{ id: OperatingPillarId; label: string }>
  features: Record<OperatingFeatureId, boolean>
  roles: Record<UserRole, OperatingRoleProfile>
  actions: {
    gatewayPolicyId: string
    proposalPolicyId: string
    allowedConfirmedActions: readonly ConfirmedActionId[]
    taskSourcePrefix: string
    attribution: string
  }
  workflows: {
    valuation: {
      allowedTargets: readonly ValuationWorkflowStatus[]
      mfaTargets: readonly ValuationWorkflowStatus[]
      returnTaskDueDays: number
    }
  }
  assistant: {
    dailyWorkFirst: true
    proactiveWorkWhenClear: true
    maxProactiveActions: number
    humanConfirmationForWrites: true
  }
}

export const DEFAULT_TENANT_ID = 'property-partners'

const PROPERTY_PARTNERS_PROFILE: OperatingProfile = {
  schemaVersion: 1,
  tenantId: DEFAULT_TENANT_ID,
  clientName: 'Property Partners',
  marketScope: 'Vitacura',
  pillars: [
    { id: 'management', label: 'Control de gestión' },
    { id: 'intelligence', label: 'Inteligencia de negocios' },
    { id: 'valuation', label: 'Valorizador de propiedades' },
  ],
  features: {
    'daily-work': true,
    management: true,
    'market-intelligence': true,
    portfolio: true,
    valuation: true,
    reports: true,
    assistant: true,
    'action-gateway': true,
    'user-administration': true,
    'source-governance': true,
    'activity-feed': true,
    'attention-inbox': true,
  },
  roles: {
    ceo: {
      label: 'CEO',
      scope: 'global',
      proactiveActions: [
        { id: 'ceo-management-intervention', title: 'Revisar la oficina con mayor brecha y definir una intervención concreta con su directora.', domain: 'management', href: '/dashboard/control/operations', condition: 'always', priority: 'high' },
        { id: 'ceo-valuation-review', title: 'Revisar valorizaciones pendientes de decisión o aprobación.', domain: 'valuation', href: '/dashboard/valuations', condition: 'has-valuation-review', priority: 'high' },
        { id: 'ceo-valuation-health', title: 'Revisar el estado del valorizador y confirmar que no haya expedientes detenidos.', domain: 'valuation', href: '/dashboard/valuations', condition: 'no-valuation-review', priority: 'medium' },
        { id: 'ceo-market-focus', title: 'Revisar cartera y mercado para decidir dónde concentrar seguimiento comercial.', domain: 'market', href: '/dashboard/market', condition: 'market-available', priority: 'medium' },
      ],
    },
    admin: {
      label: 'Administración',
      scope: 'global',
      proactiveActions: [
        { id: 'admin-data-gaps', title: 'Resolver propiedades con identidad, vigencia o documentación pendiente.', domain: 'administration', href: '/dashboard/properties', condition: 'has-data-gaps', priority: 'high' },
        { id: 'admin-portfolio-order', title: 'Ordenar cartera y asignaciones para dejar el trabajo comercial listo para el equipo.', domain: 'administration', href: '/dashboard/properties/admin', condition: 'always', priority: 'medium' },
        { id: 'admin-source-review', title: 'Revisar datos y fuentes que necesiten actualización o validación.', domain: 'administration', href: '/dashboard/market/fuentes', condition: 'always', priority: 'medium' },
      ],
    },
    director: {
      label: 'Dirección de Cuenta',
      scope: 'office',
      proactiveActions: [
        { id: 'director-valuation-review', title: 'Revisar la valorización más prioritaria de la oficina y decidir si corresponde aceptar o devolver.', domain: 'valuation', href: '/dashboard/valuations', condition: 'has-valuation-review', priority: 'high' },
        { id: 'director-valuation-progress', title: 'Revisar el avance de valorizaciones de la oficina y detectar cuál conviene impulsar hoy.', domain: 'valuation', href: '/dashboard/valuations', condition: 'no-valuation-review', priority: 'medium' },
        { id: 'director-partner-support', title: 'Revisar cartera y seguimiento de Partners para definir a quién contactar o apoyar hoy.', domain: 'contacts', href: '/dashboard/properties/admin', condition: 'always', priority: 'medium' },
        { id: 'director-admin-delegation', title: 'Pedir a administración resolver brechas de documentación, identidad o vigencia que estén frenando la operación.', domain: 'documents', href: '/dashboard/properties', condition: 'has-data-gaps', priority: 'medium' },
      ],
    },
    subdirector: {
      label: 'Subdirección de Cuenta',
      scope: 'office',
      proactiveActions: [
        { id: 'subdirector-valuation-review', title: 'Revisar la valorización más prioritaria de la oficina y preparar la siguiente decisión.', domain: 'valuation', href: '/dashboard/valuations', condition: 'has-valuation-review', priority: 'high' },
        { id: 'subdirector-valuation-progress', title: 'Revisar el avance de valorizaciones de la oficina y detectar cuál conviene impulsar hoy.', domain: 'valuation', href: '/dashboard/valuations', condition: 'no-valuation-review', priority: 'medium' },
        { id: 'subdirector-partner-support', title: 'Revisar cartera y seguimiento de Partners para definir a quién contactar o apoyar hoy.', domain: 'contacts', href: '/dashboard/properties/admin', condition: 'always', priority: 'medium' },
        { id: 'subdirector-admin-delegation', title: 'Pedir a administración resolver brechas de documentación, identidad o vigencia que estén frenando la operación.', domain: 'documents', href: '/dashboard/properties', condition: 'has-data-gaps', priority: 'medium' },
      ],
    },
    seller: {
      label: 'Partner',
      scope: 'self',
      proactiveActions: [
        { id: 'seller-valuation-progress', title: 'Avanzar una valorización y revisar comparables o antecedentes antes de enviarla.', domain: 'valuation', href: '/dashboard/valuations', condition: 'has-valuation-work', priority: 'high' },
        { id: 'seller-valuation-start', title: 'Preparar una valorización de una propiedad activa de tu cartera.', domain: 'valuation', href: '/dashboard/valuations', condition: 'no-valuation-work', priority: 'medium' },
        { id: 'seller-portfolio-contact', title: 'Ordenar tu cartera y definir los próximos contactos, llamados o seguimientos comerciales.', domain: 'contacts', href: '/dashboard/properties', condition: 'has-portfolio', priority: 'medium' },
        { id: 'seller-market-prospect', title: 'Revisar oportunidades de mercado y preparar el próximo contacto comercial.', domain: 'market', href: '/dashboard/market', condition: 'no-portfolio', priority: 'medium' },
        { id: 'seller-document-review', title: 'Revisar documentación, identidad o vigencia de la propiedad que tenga mayor brecha.', domain: 'documents', href: '/dashboard/properties', condition: 'has-portfolio-attention', priority: 'medium' },
      ],
    },
  },
  actions: {
    gatewayPolicyId: 'pedro-pablo-action-gateway-v1',
    proposalPolicyId: 'pedro-pablo-proposal-contract-v4-reports-aware',
    allowedConfirmedActions: ['create_task'],
    taskSourcePrefix: 'pedro-pablo',
    attribution: 'Pedro Pablo',
  },
  workflows: {
    valuation: {
      allowedTargets: ['draft', 'review', 'approved', 'issued'],
      mfaTargets: ['approved', 'issued'],
      returnTaskDueDays: 3,
    },
  },
  assistant: {
    dailyWorkFirst: true,
    proactiveWorkWhenClear: true,
    maxProactiveActions: 3,
    humanConfirmationForWrites: true,
  },
}

const PROFILES: Record<string, OperatingProfile> = {
  [PROPERTY_PARTNERS_PROFILE.tenantId]: PROPERTY_PARTNERS_PROFILE,
}

export function getOperatingProfile(tenantId: string): OperatingProfile {
  const profile = PROFILES[tenantId]
  if (!profile) throw new Error(`Unknown operating profile: ${tenantId}`)
  return profile
}

export function getRoleOperatingProfile(profile: OperatingProfile, role: string): OperatingRoleProfile | null {
  return profile.roles[role as UserRole] ?? null
}
