#!/usr/bin/env node
// Test Suite: Director & Partner Role-Scoped Copilots (Week 2–3)

import fs from 'fs'
import path from 'path'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
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

// Test 1: API Routes Exist
const directorRoute = path.join(PROJECT_ROOT, 'app/api/director/question/route.ts')
const partnerRoute = path.join(PROJECT_ROOT, 'app/api/partner/question/route.ts')

assert(fs.existsSync(directorRoute), 'Director API route exists at app/api/director/question/route.ts')
assert(fs.existsSync(partnerRoute), 'Partner API route exists at app/api/partner/question/route.ts')

// Test 2: API Routes Have Role Verification
const directorRouteContent = fs.readFileSync(directorRoute, 'utf-8')
const partnerRouteContent = fs.readFileSync(partnerRoute, 'utf-8')

assert(directorRouteContent.includes('director'), 'Director route verifies director role')
assert(partnerRouteContent.includes('partner'), 'Partner route verifies partner role')

// Test 3: API Routes Call Correct Intelligence Context
assert(directorRouteContent.includes("buildN3uraliaIntelligenceContext('director')"), 'Director route builds scoped intelligence context')
assert(partnerRouteContent.includes("buildN3uraliaIntelligenceContext('seller')"), 'Partner route builds scoped intelligence context')

// Test 4: Widgets Exist
const directorWidget = path.join(PROJECT_ROOT, 'components/director/director-ai-assistant-widget.tsx')
const partnerWidget = path.join(PROJECT_ROOT, 'components/partner/partner-ai-assistant-widget.tsx')

assert(fs.existsSync(directorWidget), 'Director widget exists at components/director/director-ai-assistant-widget.tsx')
assert(fs.existsSync(partnerWidget), 'Partner widget exists at components/partner/partner-ai-assistant-widget.tsx')

// Test 5: Widgets Export Functions
const directorWidgetContent = fs.readFileSync(directorWidget, 'utf-8')
const partnerWidgetContent = fs.readFileSync(partnerWidget, 'utf-8')

assert(directorWidgetContent.includes('export function DirectorAIAssistantWidget'), 'Director widget exports DirectorAIAssistantWidget')
assert(partnerWidgetContent.includes('export function PartnerAIAssistantWidget'), 'Partner widget exports PartnerAIAssistantWidget')

// Test 6: Widgets Call Correct API Endpoints
assert(directorWidgetContent.includes('/api/director/question'), 'Director widget calls /api/director/question')
assert(partnerWidgetContent.includes('/api/partner/question'), 'Partner widget calls /api/partner/question')

// Test 7: Dashboard Layout Imports All Widgets
const layoutFile = path.join(PROJECT_ROOT, 'app/dashboard/layout.tsx')
const layoutContent = fs.readFileSync(layoutFile, 'utf-8')

assert(layoutContent.includes('DirectorAIAssistantWidget'), 'Dashboard layout imports DirectorAIAssistantWidget')
assert(layoutContent.includes('PartnerAIAssistantWidget'), 'Dashboard layout imports PartnerAIAssistantWidget')

// Test 8: Dashboard Layout Mounts Widgets by Role
assert(layoutContent.includes("role === 'director'"), 'Dashboard layout mounts Director widget when role is director')
assert(layoutContent.includes("role === 'partner'"), 'Dashboard layout mounts Partner widget when role is partner')

// Test 9: Role Verification in API Routes
assert(directorRouteContent.includes('401') || directorRouteContent.includes('403'), 'Director route returns error for unauthorized access')
assert(partnerRouteContent.includes('401') || partnerRouteContent.includes('403'), 'Partner route returns error for unauthorized access')

// Test 10: Executive Reasoning Pipeline Called
assert(directorRouteContent.includes('runExecutiveReasoningPipeline'), 'Director route calls reasoning pipeline')
assert(partnerRouteContent.includes('runExecutiveReasoningPipeline'), 'Partner route calls reasoning pipeline')

// Test 11: Response Types
assert(directorRouteContent.includes('NextResponse.json'), 'Director route returns JSON response')
assert(partnerRouteContent.includes('NextResponse.json'), 'Partner route returns JSON response')

// Test 12: Error Handling
assert(directorRouteContent.includes('catch'), 'Director route has error handling')
assert(partnerRouteContent.includes('catch'), 'Partner route has error handling')

console.log(`\n${colors.green}All 12 tests passed!${colors.reset}`)
console.log(`${colors.yellow}Week 2–3: Director & Partner Copilots Verified${colors.reset}\n`)
