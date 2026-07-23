import {
  CRM_INTELLIGENCE,
  getDataQuality,
  getOperationalSummary,
  getYtdSummary,
} from '@/lib/crm-snapshot'
import {
  getBranchSalesYtdPerformance,
  getCompanySalesCompliance,
} from '@/lib/targets-2026'

export type IntelligenceAudience = 'ceo' | 'director' | 'seller' | 'system'
export type IntelligenceDomain = '