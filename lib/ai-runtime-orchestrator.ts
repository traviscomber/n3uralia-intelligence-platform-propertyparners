export type AIRuntimeRequest = {
  question: string
  context: string[]
  requiredCapabilities: string[]
}

export type AIRuntimeResponse = {
  modelStrategy: string
  toolsUsed: string[]
  contextUsed: string[]
  validationRequired: boolean
}

export function selectAIRuntimeStrategy(
  input: AIRuntimeRequest
): AIRuntimeResponse {
  return {
    modelStrategy:
      'Select reasoning model according to complexity and evidence requirements.',
    toolsUsed: input.requiredCapabilities,
    contextUsed: input.context,
    validationRequired: true,
  }
}
