import test from 'node:test'
import assert from 'node:assert/strict'
import { detectOutOfScopeMarket, expertiseCardsForPrompt } from '../lib/pedro-pablo/vitacura-expertise'
import { routePedroPabloPrompt } from '../lib/pedro-pablo/agentic-router'

const topics = (prompt: string) => expertiseCardsForPrompt(prompt).map((card) => card.topic)

test('pricing question activates valuation + pricing expertise', () => {
  const active = topics('¿Qué precio de salida recomiendas para una casa en Lo Curro?')
  assert.ok(active.includes('commercial_valuation'))
  assert.ok(active.includes('pricing_strategy'))
  assert.equal(routePedroPabloPrompt('¿Qué precio de salida recomiendas para una casa en Lo Curro?').route, 'full-agentic')
})

test('marketability question activates senior liquidity expertise', () => {
  const active = topics('Analiza la marketability y liquidez de esta propiedad')
  assert.ok(active.includes('marketability'))
})

test('commercial due diligence question activates evidence review', () => {
  const active = topics('¿Qué falta revisar de recepción final, superficie y regularización?')
  assert.ok(active.includes('due_diligence'))
})

test('Las Condes is explicitly outside the approved canonical universe', () => {
  const conflict = detectOutOfScopeMarket('Compárame esta casa de Vitacura con Las Condes')
  assert.equal(conflict?.requestedCommune, 'las condes')
  assert.equal(conflict?.allowedCommune, 'Vitacura')
})

test('Vitacura-only prompts do not trigger a geographic conflict', () => {
  assert.equal(detectOutOfScopeMarket('Compara esta casa de Lo Curro con Vitacura'), null)
})


test('senior communication contract is explicit about uncertainty', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('lib/pedro-pablo/vitacura-expertise.ts', 'utf8'))
  assert.match(source, /profesional, directo, sobrio y no condescendiente/)
  assert.match(source, /No tengo información suficiente para responder eso con rigor/)
  assert.match(source, /certeza simulada/)
})

test('visible senior answer refuses unsupported pricing and liquidity precision', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('app/api/pedro-pablo/decision-support/route.ts', 'utf8'))
  assert.match(source, /No tengo información suficiente para recomendar una cifra todavía/)
  assert.match(source, /No tengo información suficiente para estimar liquidez/)
  assert.doesNotMatch(source, /seguramente se venderá/)
})


test('assistant follow-up questions are contextual instead of static starters', async () => {
  const route = await import('node:fs/promises').then((fs) => fs.readFile('app/api/pedro-pablo/decision-support/route.ts', 'utf8'))
  const chat = await import('node:fs/promises').then((fs) => fs.readFile('components/intelligence/pedro-pablo-floating-chat.tsx', 'utf8'))

  assert.match(route, /function suggestedQuestionsForPrompt\(/)
  assert.match(route, /¿Qué comparables sostienen mejor esta valorización\?/)
  assert.match(route, /¿Qué antecedente falta verificar antes de avanzar\?/)
  assert.match(chat, /message\.suggestedQuestions/)
  assert.match(chat, /Primero reviso pendientes reales/)
  assert.match(chat, /Organizar mi día/)
  assert.doesNotMatch(chat, /const starters =/)
})


test('assistant opens with today first and keeps the three business pillars available', async () => {
  const chat = await import('node:fs/promises').then((fs) => fs.readFile('components/intelligence/pedro-pablo-floating-chat.tsx', 'utf8'))
  for (const label of ['Control de gestión', 'Inteligencia de negocios', 'Valorizador']) {
    assert.match(chat, new RegExp(label))
  }
  assert.match(chat, /Empecemos por hoy/)
  assert.match(chat, /Organizar mi día/)
  assert.match(chat, /Pendientes \+ siguiente acción/)
  assert.match(chat, /onClick=\{\(\) => void ask\(dailyPrompt\)\}/)
})

test('daily priorities put tasks before general market movement', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('app/api/pedro-pablo/route.ts', 'utf8'))
  const priorities = source.slice(
    source.indexOf('function answerPriorities'),
    source.indexOf('function answerTasks'),
  )
  assert.ok(priorities.indexOf('const activeTasks') > -1)
  assert.ok(priorities.indexOf('const market = context.market') > -1)
  assert.ok(priorities.indexOf('const activeTasks') < priorities.indexOf('const market = context.market'))
  assert.match(priorities, /title: 'Qué requiere atención hoy'/)
})


test('assistant keeps useful work available through the reusable operating profile', async () => {
  const fs = await import('node:fs/promises')
  const source = await fs.readFile('app/api/pedro-pablo/route.ts', 'utf8')
  const profile = await fs.readFile('lib/platform/operating-profile.ts', 'utf8')

  assert.match(source, /function proactiveWork\(/)
  assert.match(source, /buildNextBestActions/)
  assert.match(source, /getRuntimeOperatingProfile/)
  assert.match(source, /Sin tareas formales · trabajo disponible/)
  assert.match(source, /Siguiente mejor acción/)
  assert.match(profile, /Ordenar tu cartera/)
  assert.match(profile, /Avanzar una valorización/)
})
