export type CopilotFrequency = 'daily' | 'weekly' | 'manual'

export type CEOCopilotPreferences = {
  userId: string
  frequency: CopilotFrequency
  preferredTime?: string
  morningBriefing: boolean
  maxInsights: number
  topics: string[]
}

export type CopilotMemory = {
  userId: string
  preferences: CEOCopilotPreferences
  learnedPatterns: string[]
  previousDecisions: string[]
}

export function buildCEOCopilotProfile(
  input: CEOCopilotPreferences
): CopilotMemory {
  return {
    userId: input.userId,
    preferences: input,
    learnedPatterns: [],
    previousDecisions: [],
  }
}
