#!/usr/bin/env node
// scripts/test-pipeline-end-to-end.mjs
// End-to-end test: buildN3uraliaIntelligenceContext → runExecutiveReasoningPipeline
// Verifies the full data-flow from Property Partners evidence to structured response.

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// ── helpers ────────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
const results = []

function assert(condition, label) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
    passed++
    results.push({ label, ok: true })
  } else {
    console.error(`  \x1b[31m✗\x1b[0m ${label}`)
    failed++
    results.push({ label, ok: false })
  }
}

// ── transpile TS at runtime via tsx / ts-node ──────────────────────────────────
const { register } = await import('tsx/esm').catch(() => ({ register: null }))
if (register) register()

// Resolve project root (scripts/ → ../)
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ── import production modules ──────────────────────────────────────────────────
const { buildN3uraliaIntelligenceContext } = await import(
  join(root, 'lib', 'n3uralia-intelligence-engine.ts')
)
const { runExecutiveReasoningPipeline } = await import(
  join(root, 'lib', 'executive-reasoning-pipeline.ts')
)

// ── Test Setup ─────────────────────────────────────────────────────────────────
console.log('\n\x1b[34m=== End-to-End: CEO Reasoning Pipeline ===\x1b[0m\n')

// Step 1: Build intelligence context
// buildN3uraliaIntelligenceContext returns N3uraliaIntelligenceContext directly;
// evidence, signals, risks, and actions are top-level fields.
console.log('\x1b[33mStep 1: Build N3uralia Intelligence Context (CEO)\x1b[0m')
const intelligence = buildN3uraliaIntelligenceContext('ceo')

assert(intelligence !== null && intelligence !== undefined, 'Intelligence context is defined')
assert(Array.isArray(intelligence.evidence), 'Context has evidence array')
assert(intelligence.evidence.length > 0, 'Evidence array is non-empty')
assert(
  intelligence.evidence.some((e) => e.domain === 'crm'),
  'Evidence includes CRM domain',
)
assert(
  intelligence.evidence.some((e) => e.domain === 'market'),
  'Evidence includes Market domain',
)

// Step 2: Run reasoning pipeline with a real question
// The pipeline expects: { role, question, reasoningMode, context: { source, requestedAt, intelligence } }
console.log('\n\x1b[33mStep 2: Run Executive Reasoning Pipeline\x1b[0m')
const response = await runExecutiveReasoningPipeline({
  role: 'ceo',
  question: '¿Qué debo saber hoy?',
  reasoningMode: 'standard',
  context: {
    source: 'test-pipeline-end-to-end',
    requestedAt: new Date().toISOString(),
    intelligence,
  },
})

assert(response !== null && response !== undefined, 'Pipeline returns a response')
assert(response.sections !== undefined, 'Response has sections')

// Step 3: Validate structured sections
console.log('\n\x1b[33mStep 3: Validate Response Sections\x1b[0m')
const s = response.sections

assert(typeof s?.resumenEjecutivo === 'string' && s.resumenEjecutivo.length > 0, 'resumenEjecutivo is a non-empty string')
assert(Array.isArray(s?.senalesPrincipales) && s.senalesPrincipales.length > 0, 'senalesPrincipales has at least one entry')
assert(Array.isArray(s?.evidenciaUtilizada) && s.evidenciaUtilizada.length > 0, 'evidenciaUtilizada is populated')
assert(Array.isArray(s?.riesgos), 'riesgos is an array')
assert(Array.isArray(s?.oportunidades), 'oportunidades is an array')

// Step 4: Validate confidence
console.log('\n\x1b[33mStep 4: Validate Confidence Score\x1b[0m')
const conf = s?.nivelConfianza
assert(conf !== undefined, 'nivelConfianza is present')
assert(['Alta', 'Media', 'Baja'].includes(conf?.label), `nivelConfianza.label is valid (got: ${conf?.label})`)
assert(typeof conf?.score === 'number' && conf.score >= 0 && conf.score <= 1, `nivelConfianza.score in [0,1] (got: ${conf?.score})`)
assert(typeof conf?.justificacion === 'string' && conf.justificacion.length > 0, 'nivelConfianza.justificacion is non-empty')

// Step 5: Verify Property Partners real data flows through
console.log('\n\x1b[33mStep 5: Real Property Partners Data Verification\x1b[0m')
assert(
  typeof s.resumenEjecutivo === 'string' && s.resumenEjecutivo.length > 0,
  'resumenEjecutivo is the primary answer (non-empty)',
)
assert(
  s.evidenciaUtilizada.some((e) => e.items && e.items.length > 0),
  'evidenciaUtilizada contains real evidence items',
)
assert(
  s.senalesPrincipales.every((sig) => typeof sig === 'string' && sig.length > 0),
  'All senalesPrincipales are non-empty strings',
)

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
if (failed === 0) {
  console.log(`\x1b[32mAll ${passed} tests passed.\x1b[0m`)
  console.log(`\x1b[33mCEO End-to-End Pipeline: VERIFIED\x1b[0m\n`)
} else {
  console.error(`\x1b[31m${failed} test(s) failed.\x1b[0m  ${passed} passed.\n`)
  process.exit(1)
}
