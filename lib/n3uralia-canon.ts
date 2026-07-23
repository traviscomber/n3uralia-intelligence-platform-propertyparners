export type N3uraliaProjectCategory =
  | 'real_estate'
  | 'finance'
  | 'retail'
  | 'hospitality'
  | 'transportation'
  | 'operations'
  | 'health'
  | 'education'
  | 'creative'
  | 'research'
  | 'general'

export type N3uraliaAgentRole =
  | 'executive'
  | 'research'
  | 'market'
  | 'economy'
  | 'operations'
  | 'risk'
  | 'opportunity'
  | 'strategy'
  | 'domain_specialist'
  | 'publisher'
  | 'governance'

export type N3uraliaIntelligenceLayer =
  | 'evidence'
  | 'external_research'
  | 'knowledge'
  | 'reasoning'
  | 'prediction'
  | 'strategy'
  | 'communication'
  | 'governance'

export type N3uraliaSourceClass =
  | 'client_evidence'
  | 'public_data'
  | 'licensed_data'
  | 'n3uralia_research'
  | 'n3uralia_model'
  | 'n3uralia_inference'

export type N3uraliaCategoryProfile = {
  category: N3uraliaProjectCategory
  primaryQuestions: string[]
  mandatoryExternalSignals: string[]
  mandatoryDomainAgents: string[]
  expectedOutputs: string[]
  highImpactActions: string[]
}

export type N3uraliaProjectCanon = {
  canonVersion: '1.0.0'
  project: {
    id: string
    name: string
    category: N3uraliaProjectCategory
    clientFacingBrand: string
    engineOwner: 'N3uralia'
    engineVisibility: 'powered_by' | 'private' | 'internal_only'
  }
  doctrine: {
    clientOwnsEngine: false
    clientDataIsOneInputOnly: true
    engineMustResearchBeyondClientData: true
    engineMustChallengeUnsupportedAssumptions: true
    engineMustSeparateEvidenceInferenceAndOpinion: true
    engineMustDiscloseUncertainty: true
    engineMustPreferDecisionQualityOverStakeholderPreference: true
    engineMustCollaborateInGoodFaith: true
  }
  requiredLayers: N3uraliaIntelligenceLayer[]
  requiredAgents: N3uraliaAgentRole[]
  allowedSourceClasses: N3uraliaSourceClass[]
  categoryProfile: N3uraliaCategoryProfile
  governance: {
    syntheticScoreAllowed: false
    evidenceLineageRequired: true
    sourceFreshnessRequired: true
    claimsNeedSupport: true
    autonomousActionsRequirePolicy: true
    humanApprovalRequiredForHighImpactActions: true
    clientPrivateDataMayTrainGlobalModels: false
    crossClientKnowledgeMustBeDeidentified: true
  }
}

export const N3URALIA_CORE_LAYERS: N3uraliaIntelligenceLayer[] = [
  'evidence',
  'external_research',
  'knowledge',
  'reasoning',
  'prediction',
  'strategy',
  'communication',
  'governance',
]

export const N3URALIA_CORE_AGENTS: N3uraliaAgentRole[] = [
  'executive',
  'research',
  'risk',
  'opportunity',
  'strategy',
  'publisher',
  'governance',
]

export const N3URALIA_SOURCE_CLASSES: N3uraliaSourceClass[] = [
  'client_evidence',
  'public_data',
  'licensed_data',
  'n3uralia_research',
  'n3uralia_model',
  'n3uralia_inference',
]

const profiles: Record<N3uraliaProjectCategory, N3uraliaCategoryProfile> = {
  real_estate: {
    category: 'real_estate',
    primaryQuestions: ['What is happening in the market?', 'What is an asset worth and why?', 'Where are liquidity, pricing and absorption changing?', 'Which commercial action creates the highest expected value?'],
    mandatoryExternalSignals: ['listing supply', 'transaction evidence', 'asking and closing prices', 'absorption', 'time on market', 'mortgage rates', 'inflation and indexed units', 'construction permits', 'territorial development', 'competitor activity'],
    mandatoryDomainAgents: ['market', 'valuation', 'economy', 'territory', 'crm'],
    expectedOutputs: ['market signals', 'valuation ranges', 'risk alerts', 'opportunities', 'executive recommendations'],
    highImpactActions: ['publish valuation', 'change pricing', 'allocate commercial budget', 'recommend acquisition or sale'],
  },
  finance: {
    category: 'finance',
    primaryQuestions: ['Where is risk accumulating?', 'What explains performance?', 'What scenarios are plausible?', 'What improves risk-adjusted return?'],
    mandatoryExternalSignals: ['rates', 'inflation', 'credit spreads', 'liquidity', 'volatility', 'regulation'],
    mandatoryDomainAgents: ['economy', 'portfolio', 'risk', 'compliance'],
    expectedOutputs: ['risk decomposition', 'scenario analysis', 'opportunity ranking', 'decision memos'],
    highImpactActions: ['execute transaction', 'rebalance portfolio', 'approve credit', 'change exposure limits'],
  },
  retail: {
    category: 'retail',
    primaryQuestions: ['What drives demand?', 'Where is margin leaking?', 'What should be promoted, stocked or discontinued?'],
    mandatoryExternalSignals: ['competitor pricing', 'consumer demand', 'seasonality', 'inventory availability', 'local events'],
    mandatoryDomainAgents: ['demand', 'pricing', 'inventory', 'customer', 'operations'],
    expectedOutputs: ['demand forecasts', 'pricing guidance', 'inventory actions', 'customer opportunities'],
    highImpactActions: ['change prices', 'place inventory order', 'launch promotion', 'remove assortment'],
  },
  hospitality: {
    category: 'hospitality',
    primaryQuestions: ['What drives occupancy and spend?', 'Where is guest experience failing?', 'How should capacity and price change?'],
    mandatoryExternalSignals: ['travel demand', 'competitor rates', 'events', 'weather', 'flight capacity', 'reviews', 'seasonality'],
    mandatoryDomainAgents: ['revenue', 'guest', 'operations', 'market', 'experience'],
    expectedOutputs: ['occupancy forecast', 'rate guidance', 'service alerts', 'segment opportunities'],
    highImpactActions: ['change public rate', 'close inventory', 'alter staffing', 'contact guest'],
  },
  transportation: {
    category: 'transportation',
    primaryQuestions: ['Where is demand changing?', 'How can service become safer and more efficient?', 'Which assets or routes are underused?'],
    mandatoryExternalSignals: ['traffic', 'weather', 'events', 'energy prices', 'road conditions', 'regulation', 'mobility demand'],
    mandatoryDomainAgents: ['fleet', 'route', 'safety', 'demand', 'maintenance'],
    expectedOutputs: ['route recommendations', 'fleet plans', 'safety alerts', 'maintenance forecasts'],
    highImpactActions: ['dispatch vehicle', 'change route', 'remove asset from service', 'alter safety policy'],
  },
  operations: {
    category: 'operations',
    primaryQuestions: ['Where is work blocked?', 'What creates cost or delay?', 'What can be automated?'],
    mandatoryExternalSignals: ['supplier conditions', 'cost indices', 'service levels', 'regulation', 'capacity constraints'],
    mandatoryDomainAgents: ['process', 'capacity', 'quality', 'cost', 'automation'],
    expectedOutputs: ['bottleneck analysis', 'automation proposals', 'capacity plans', 'control alerts'],
    highImpactActions: ['modify workflow', 'approve supplier', 'allocate budget', 'automate external action'],
  },
  health: {
    category: 'health',
    primaryQuestions: ['What improves outcomes safely?', 'Where is risk increasing?', 'What evidence supports an intervention?'],
    mandatoryExternalSignals: ['clinical guidance', 'public health data', 'capacity', 'regulation', 'safety notices'],
    mandatoryDomainAgents: ['clinical_evidence', 'safety', 'capacity', 'quality', 'compliance'],
    expectedOutputs: ['evidence summaries', 'operational alerts', 'capacity recommendations', 'quality monitoring'],
    highImpactActions: ['clinical recommendation', 'patient contact', 'change treatment', 'allocate scarce care'],
  },
  education: {
    category: 'education',
    primaryQuestions: ['Where are learners struggling?', 'Which interventions improve progress?', 'What skills are becoming important?'],
    mandatoryExternalSignals: ['learning standards', 'labour demand', 'research evidence', 'engagement benchmarks', 'policy'],
    mandatoryDomainAgents: ['learning', 'curriculum', 'engagement', 'outcomes', 'research'],
    expectedOutputs: ['learning signals', 'intervention suggestions', 'curriculum guidance', 'outcome reports'],
    highImpactActions: ['grade learner', 'change enrolment', 'issue credential', 'make disciplinary decision'],
  },
  creative: {
    category: 'creative',
    primaryQuestions: ['What is original and relevant?', 'What audience response is emerging?', 'What concept should be developed next?'],
    mandatoryExternalSignals: ['cultural trends', 'audience response', 'platform formats', 'rights constraints', 'market demand'],
    mandatoryDomainAgents: ['creative_director', 'audience', 'culture', 'production', 'rights'],
    expectedOutputs: ['concepts', 'creative critique', 'production plans', 'audience hypotheses'],
    highImpactActions: ['publish content', 'license material', 'spend production budget', 'represent a real person'],
  },
  research: {
    category: 'research',
    primaryQuestions: ['What is known?', 'What remains uncertain?', 'Which hypothesis is most valuable to test?'],
    mandatoryExternalSignals: ['primary literature', 'datasets', 'replication evidence', 'methodological standards', 'recent findings'],
    mandatoryDomainAgents: ['literature', 'methods', 'data', 'hypothesis', 'replication'],
    expectedOutputs: ['evidence maps', 'research briefs', 'hypotheses', 'experimental plans'],
    highImpactActions: ['publish claim', 'run costly experiment', 'use human subjects', 'release sensitive dataset'],
  },
  general: {
    category: 'general',
    primaryQuestions: ['What is happening?', 'Why is it happening?', 'What could happen next?', 'What should be done and with what confidence?'],
    mandatoryExternalSignals: ['relevant public evidence', 'industry benchmarks', 'regulation', 'economic context'],
    mandatoryDomainAgents: ['domain_specialist', 'market', 'operations'],
    expectedOutputs: ['signals', 'risks', 'opportunities', 'recommendations', 'executive communication'],
    highImpactActions: ['external communication', 'financial commitment', 'irreversible system change', 'decision affecting people'],
  },
}

export const N3URALIA_CATEGORY_PROFILES = profiles

export function createN3uraliaProjectCanon(input: {
  id: string
  name: string
  category: N3uraliaProjectCategory
  clientFacingBrand: string
  engineVisibility?: 'powered_by' | 'private' | 'internal_only'
}): N3uraliaProjectCanon {
  return {
    canonVersion: '1.0.0',
    project: {
      id: input.id,
      name: input.name,
      category: input.category,
      clientFacingBrand: input.clientFacingBrand,
      engineOwner: 'N3uralia',
      engineVisibility: input.engineVisibility ?? 'powered_by',
    },
    doctrine: {
      clientOwnsEngine: false,
      clientDataIsOneInputOnly: true,
      engineMustResearchBeyondClientData: true,
      engineMustChallengeUnsupportedAssumptions: true,
      engineMustSeparateEvidenceInferenceAndOpinion: true,
      engineMustDiscloseUncertainty: true,
      engineMustPreferDecisionQualityOverStakeholderPreference: true,
      engineMustCollaborateInGoodFaith: true,
    },
    requiredLayers: N3URALIA_CORE_LAYERS,
    requiredAgents: N3URALIA_CORE_AGENTS,
    allowedSourceClasses: N3URALIA_SOURCE_CLASSES,
    categoryProfile: profiles[input.category],
    governance: {
      syntheticScoreAllowed: false,
      evidenceLineageRequired: true,
      sourceFreshnessRequired: true,
      claimsNeedSupport: true,
      autonomousActionsRequirePolicy: true,
      humanApprovalRequiredForHighImpactActions: true,
      clientPrivateDataMayTrainGlobalModels: false,
      crossClientKnowledgeMustBeDeidentified: true,
    },
  }
}
