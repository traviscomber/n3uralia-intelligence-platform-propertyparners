export type MemorySearchResult = {
  question: string
  similarCases: string[]
  successfulPatterns: string[]
  failedPatterns: string[]
  lessons: string[]
}

export function queryInstitutionalMemory(input: {
  question: string
  cases: {
    type: 'success' | 'failure'
    description: string
    lesson: string
  }[]
}): MemorySearchResult {
  return {
    question: input.question,
    similarCases: input.cases.map((item) => item.description),
    successfulPatterns: input.cases
      .filter((item) => item.type === 'success')
      .map((item) => item.lesson),
    failedPatterns: input.cases
      .filter((item) => item.type === 'failure')
      .map((item) => item.lesson),
    lessons: input.cases.map((item) => item.lesson),
  }
}
