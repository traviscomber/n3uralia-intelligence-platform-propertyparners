import type { CopilotRole } from '@/lib/copilot-authorization'
import type {
  IntelligenceAction,
  IntelligenceDomain,
  IntelligenceEvidence,
  IntelligenceRisk,
  IntelligenceSignal,
  N3uraliaIntelligenceContext,
} from '@/lib/n3uralia-intelligence-engine'

type IntelligenceAccessPolicy = {
  domains: readonly IntelligenceDomain[]
  sourceClasses: readonly Intelligence