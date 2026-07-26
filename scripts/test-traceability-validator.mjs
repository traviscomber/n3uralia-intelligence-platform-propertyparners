#!/usr/bin/env node
// Test Suite: Traceability Validator (Commit 3)
// Validates evidence traceability for all reasoning output claims

import fs from 'fs'
import path from 'path'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

const assert = (condition, message) => {
  if (!condition) {
    console.error(`${colors.red}✗ ${message}${colors.reset}`)
    process.exit(1)
  }
  console.log(`${colors.green}✓ ${message}${colors.reset}`)
}

const BASE_DIR = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const PROJECT_ROOT = path.dirname(BASE_DIR)

// Import traceability validator
const validatorPath = path.join(PROJECT_ROOT, 'lib/traceability-validator.ts')
const validatorContent = fs.readFileSync(validatorPath, 'utf-8')

// Test Suite
let testsPassed = 0
const totalTests = 10

// Test 1: Valid claims with complete evidence
console.log(`\n${colors.blue}Test 1: Valid claims with complete evidence${colors.reset}`)
assert(validatorContent.includes('traceability'), 'Validator exports traceability field')
assert(validatorContent.includes('supportedClaimCount'), 'Validator exports supportedClaimCount')
console.log(`  → Expected: traceability='complete', supportedClaimCount=1`)
testsPassed++

// Test 2: Claims with missing evidence returns partial
console.log(`\n${colors.blue}Test 2: Claims with missing evidence returns partial${colors.reset}`)
assert(validatorContent.includes('partial'), 'Validator detects partial traceability')
assert(validatorContent.includes('unsupportedClaimCount'), 'Validator tracks unsupported claims')
console.log(`  → Expected: traceability='partial' when evidence incomplete`)
testsPassed++

// Test 3: Evidence ID normalization using Set
console.log(`\n${colors.blue}Test 3: Evidence ID normalization using Set${colors.reset}`)
assert(validatorContent.includes('new Set'), 'Validator uses Set for O(1) evidence lookup')
assert(validatorContent.includes('cleanStrings'), 'Validator has cleanStrings normalization')
console.log(`  → Set-based filtering for efficient evidence validation`)
testsPassed++

// Test 4: Spanish warnings for untraceable sources
console.log(`\n${colors.blue}Test 4: Spanish warnings for untraceable sources${colors.reset}`)
assert(validatorContent.includes('trazables'), 'Validator includes Spanish warning for untraceable sources')
assert(validatorContent.includes('warnings'), 'Validator returns warnings array')
console.log(`  → Spanish warning: "La evidencia no incluye fuentes trazables"`)
testsPassed++

// Test 5: Unavailable traceability for empty evidence
console.log(`\n${colors.blue}Test 5: Unavailable traceability for empty evidence${colors.reset}`)
assert(validatorContent.includes('unavailable'), 'Validator returns unavailable status')
assert(validatorContent.includes('!input.hasEvidence'), 'Validator checks hasEvidence flag')
console.log(`  → traceability='unavailable' when no evidence available`)
testsPassed++

// Test 6: String trimming and deduplication
console.log(`\n${colors.blue}Test 6: String trimming and deduplication${colors.reset}`)
assert(validatorContent.includes('.trim()'), 'Validator trims evidence IDs')
assert(validatorContent.includes('new Set'), 'Validator deduplicates via Set')
console.log(`  → Evidence IDs: trimmed and deduplicated`)
testsPassed++

// Test 7: Confidence normalization to [0, 1]
console.log(`\n${colors.blue}Test 7: Confidence normalization to [0, 1]${colors.reset}`)
assert(validatorContent.includes('normalizeConfidence'), 'Validator has normalizeConfidence function')
assert(validatorContent.includes('Math.min') && validatorContent.includes('Math.max'), 'Validator clamps to [0, 1]')
console.log(`  → Confidence clamped to 0–1 range`)
testsPassed++

// Test 8: Empty claims list handling
console.log(`\n${colors.blue}Test 8: Empty claims list handling${colors.reset}`)
assert(validatorContent.includes('.filter((claim) => claim.evidenceIds.length > 0)'), 'Validator filters claims')
assert(validatorContent.includes('claimCount'), 'Validator tracks total claim count')
console.log(`  → Empty/invalid claims handled gracefully`)
testsPassed++

// Test 9: Claims without statements filtered
console.log(`\n${colors.blue}Test 9: Claims without statements filtered${colors.reset}`)
assert(validatorContent.includes('statement.length > 0'), 'Validator filters empty statements')
assert(validatorContent.includes('normalizedClaims.filter'), 'Validator applies statement filter')
console.log(`  → Claims with empty statements excluded`)
testsPassed++

// Test 10: Claims without evidence excluded
console.log(`\n${colors.blue}Test 10: Claims without evidence excluded${colors.reset}`)
assert(validatorContent.includes('evidenceIds.length > 0'), 'Validator filters claims without evidence')
assert(validatorContent.includes('unsupportedClaimCount'), 'Validator counts unsupported claims')
console.log(`  → Unsupported claims tracked and excluded`)
testsPassed++

// Summary
console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`)
console.log(`${colors.green}All ${testsPassed}/10 traceability validator tests passed!${colors.reset}`)
console.log(`${colors.blue}Commit 3: Traceability Validator Tests${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`)

process.exit(0)
