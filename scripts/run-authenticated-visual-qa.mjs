import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

// Audit the live, production-tagged deployment without triggering the separate
// Cloudflare browser-challenge gate on the customer-facing domain.
const baseUrl = (process.env.QA_BASE_URL || 'https://n3uralia-intelligence-platform.vercel.app').replace(/\/$/, '')
const outputRoot = path.resolve(process.env.QA_OUTPUT_DIR || 'artifacts/visual-qa')
const sharedPassword = process.env.QA_PASSWORD || null

const profiles = [
  { key: 'ceo', email: process.env.QA_CEO_EMAIL, password: process.env.QA_CEO_PASSWORD || sharedPassword, start: '/dashboard/ceo' },
  { key: 'director', email: process.env.QA_DIRECTOR_EMAIL, password: process.env.QA_DIRECTOR_PASSWORD || sharedPassword, start: '/dashboard/director' },
  { key: 'subdirector', email: process.env.QA_SUBDIRECTOR_EMAIL, password: process.env.QA_SUBDIRECTOR_PASSWORD || sharedPassword, start: '/dashboard/director' },
  { key: 'lo-beltran', email: process.env.QA_LO_BELTRAN_EMAIL, password: process.env.QA_LO_BELTRAN_PASSWORD || sharedPassword, start: '/dashboard/partner' },
  { key: 'nueva-costanera', email: process.env.QA_NUEVA_COSTANERA_EMAIL, password: process.env.QA_NUEVA_COSTANERA_PASSWORD || sharedPassword, start: '/dashboard/partner' },
  { key: 'santa-maria', email: process.env.QA_SANTA_MARIA_EMAIL, password: process.env.QA_SANTA_MARIA_PASSWORD || sharedPassword, start: '/dashboard/partner' },
].filter((item) => item.email)

const protectedVisualRoutes = ['/dashboard/valuations']

const viewports = [
  { key: 'desktop', width: 1440, height: 1000 },
  { key: 'tablet', width: 820, height: 1180 },
  { key: 'mobile', width: 390, height: 844 },
]

if (!profiles.length) throw new Error('At least one QA_*_EMAIL variable is required.')
for (const profile of profiles) {
  if (!profile.password) throw new Error(`Missing password for QA profile ${profile.key}.`)
}

let browserRuntime = null
async function launchBrowser() {
  if (!browserRuntime) {
    const [{ default: puppeteer }, { default: chromium }] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ])
    chromium.setGraphicsMode = false
    browserRuntime = { puppeteer, chromium }
  }
  const { puppeteer, chromium } = browserRuntime
  const args = await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' })
  return puppeteer.launch({
    args,
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    defaultViewport: { width: 1440, height: 1000 },
  })
}

async function waitForAuthenticatedState(page) {
  await Promise.race([
    page.waitForFunction(() => !window.location.pathname.startsWith('/auth/login'), { timeout: 30000 }),
    page.waitForSelector('[role="alert"]', { timeout: 30000 }),
  ]).catch(() => null)

  const state = await page.evaluate(() => ({
    pathname: window.location.pathname,
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() || null,
  }))
  if (state.pathname.startsWith('/auth/login')) throw new Error(state.alert || 'Authentication did not leave the login page.')
}

// Capture only public response metadata and DOM diagnostics. Never save credentials.
async function login(page, email, password, contextDir) {
  const responses = []
  page.on('response', (response) => {
    if (response.url().startsWith(baseUrl) && responses.length < 25) {
      responses.push({ path: new URL(response.url()).pathname, status: response.status() })
    }
  })
  const navigation = await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const selector = 'input[type="email"], input[name="email"]'
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 25000 })
    await page.waitForSelector('input[type="password"], input[name="password"]', { visible: true, timeout: 10000 })
  } catch {
    const diagnostics = await page.evaluate(() => ({
      title: document.title,
      pathname: window.location.pathname,
      text: (document.body?.innerText || '').slice(0, 450),
      emailFields: document.querySelectorAll('input[type="email"]').length,
      passwordFields: document.querySelectorAll('input[type="password"]').length,
      challenge: Boolean(document.querySelector('[id*="challenge"], [class*="challenge"], iframe[src*="challenge"]')),
    }))
    await fs.writeFile(path.join(contextDir, 'login-diagnostics.json'), JSON.stringify({
      navigationStatus: navigation?.status() ?? null,
      ...diagnostics,
      responses,
    }, null, 2))
    await page.screenshot({ path: path.join(contextDir, 'login-failure.png') }).catch(() => null)
    const cloudflareChallenge = navigation?.status() === 403 && /Just a moment|security service|Cloudflare|bot/i.test(`${diagnostics.title} ${diagnostics.text}`)
    throw new Error(cloudflareChallenge
      ? 'External Cloudflare bot challenge, HTTP 403. Keep its protection enabled and use the official Vercel production alias for authenticated UI QA.'
      : `Login fields unavailable, HTTP ${navigation?.status() ?? 'unknown'}, path ${diagnostics.pathname}; see redacted diagnostics artifact.`)
  }
  await page.type(selector, email)
  await page.type('input[type="password"], input[name="password"]', password)
  await page.click('button[type="submit"]')
  await waitForAuthenticatedState(page)
}

const expectedPrimaryLabels = ['Mercado', 'Valorizador', 'Reportes']
const reportRoutes = {
  ceo: '/dashboard/reportes/canonicos',
  director: '/dashboard/director/reporte',
  subdirector: '/dashboard/director/reporte',
  'lo-beltran': '/dashboard/reportes/audiencias/ejecutivo',
  'nueva-costanera': '/dashboard/reportes/audiencias/ejecutivo',
  'santa-maria': '/dashboard/reportes/audiencias/ejecutivo',
}

async function auditPrimaryNavigation(page, profile) {
  const nav = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('nav[aria-label="Navegación principal"]')]
      .find((element) => element.getClientRects().length > 0)
    if (!visible) return { error: 'Navegación no visible' }
    const primary = visible.querySelector(':scope > div ul')
    const links = primary
      ? [...primary.querySelectorAll('a[href]')].map((link) => ({
          label: link.textContent?.trim() || '',
          path: new URL(link.href).pathname,
        }))
      : []
    const secondary = visible.querySelector(':scope > details')
    return {
      links,
      secondaryLabel: secondary?.querySelector('summary')?.textContent?.trim() || null,
      secondaryClosed: secondary ? !secondary.open : false,
      secondaryHasLinks: Boolean(secondary?.querySelector('a[href]')),
    }
  })
  const expectedPaths = ['/dashboard/market', '/dashboard/valuation', reportRoutes[profile.key]]
  const valid = Array.isArray(nav.links)
    && nav.links.length === 3
    && nav.links.every((link, index) => link.label === expectedPrimaryLabels[index] && link.path === expectedPaths[index])
    && nav.secondaryLabel?.toLowerCase().includes('más herramientas')
    && nav.secondaryClosed
    && nav.secondaryHasLinks
  return {
    profile: profile.key,
    route: profile.start,
    check: 'three-pillar-navigation',
    status: valid ? 'passed' : 'failed',
    // Navigation evidence contains only routes and labels; never user identifiers.
    ...nav,
  }
}

async function collectAccessibilitySignals(page) {
  return page.evaluate(() => {
    const focusables = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter((element) => {
        const style = window.getComputedStyle(element)
        return style.visibility !== 'hidden' && style.display !== 'none' && !element.hasAttribute('disabled')
      })
    const unnamed = focusables.filter((element) => {
      const label = (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        element.getAttribute('placeholder') ||
        ''
      ).trim()
      return !label
    }).length
    return {
      title: document.title,
      h1Count: document.querySelectorAll('h1').length,
      mainCount: document.querySelectorAll('main').length,
      focusableCount: focusables.length,
      unnamedFocusableCount: unnamed,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      alerts: document.querySelectorAll('[role="alert"]').length,
      statuses: document.querySelectorAll('[role="status"]').length,
    }
  })
}

function routeKey(route) {
  return route.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'
}

await fs.mkdir(outputRoot, { recursive: true })
const results = []

for (const profile of profiles) {
  const contextDir = path.join(outputRoot, profile.key)
  await fs.mkdir(contextDir, { recursive: true })
  const browser = await launchBrowser()
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  const browserErrors = []
  page.on('pageerror', (error) => browserErrors.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })

  try {
    await login(page, profile.email, profile.password, contextDir)
    await page.goto(`${baseUrl}${profile.start}`, { waitUntil: 'networkidle2' })
    const navigationAudit = await auditPrimaryNavigation(page, profile)
    results.push(navigationAudit)
    if (navigationAudit.status === 'failed') throw new Error('Primary navigation contract failed for this role.')

    const routes = [profile.start, ...protectedVisualRoutes]
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle2' })
      if (page.url().includes('/auth/')) throw new Error(`Protected route ${route} redirected to ${page.url()}.`)

      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 })
        await page.reload({ waitUntil: 'networkidle2' })
        const screenshotPath = path.join(contextDir, `${routeKey(route)}-${viewport.key}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        const signals = await collectAccessibilitySignals(page)
        results.push({
          profile: profile.key,
          route,
          viewport: viewport.key,
          url: page.url(),
          status: signals.horizontalOverflow || signals.unnamedFocusableCount > 0 || signals.h1Count !== 1 ? 'review' : 'captured',
          screenshot: path.relative(outputRoot, screenshotPath),
          ...signals,
        })
      }
    }

    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
    await page.goto(`${baseUrl}${profile.start}`, { waitUntil: 'networkidle2' })
    const focusTrail = []
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press('Tab')
      focusTrail.push(await page.evaluate(() => ({
        tag: document.activeElement?.tagName || null,
        text: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 120),
      })))
    }
    results.push({ profile: profile.key, route: profile.start, check: 'keyboard', status: focusTrail.some((item) => item.tag) ? 'observed' : 'failed', focusTrail })

    // Only report-specific surfaces qualify for PDF evidence. The global /dashboard/reportes/canonicos
    // navigation item contains "/report" too, but is an index page rather than a printable report.
    const reportLink = await page.$('a[href$="/reporte"], a[href*="/reportes/audiencias/"]')
    if (reportLink) {
      const href = await page.evaluate((element) => element.getAttribute('href'), reportLink)
      if (href) {
        await page.goto(new URL(href, baseUrl).toString(), { waitUntil: 'networkidle2' })
        const pdfPath = path.join(contextDir, 'valuation-report.pdf')
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true })
        const stat = await fs.stat(pdfPath)
        results.push({ profile: profile.key, route: profile.start, check: 'pdf', status: stat.size > 1000 ? 'generated' : 'failed', bytes: stat.size, file: path.relative(outputRoot, pdfPath), url: page.url() })
      }
    } else {
      results.push({ profile: profile.key, route: profile.start, check: 'pdf', status: 'not-available-on-start-page' })
    }
    results.push({ profile: profile.key, check: 'browser-errors', status: browserErrors.length ? 'review' : 'clean', errors: browserErrors.slice(0, 20) })
  } catch (error) {
    results.push({ profile: profile.key, status: 'failed', error: error instanceof Error ? error.message : String(error), url: page.url() })
  } finally {
    await page.close().catch(() => null)
    await browser.close().catch(() => null)
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  note: 'Automated evidence only. Manual screen-reader, contrast review and business acceptance remain separate.',
  profiles: profiles.map(({ key, start }) => ({ key, start, protectedVisualRoutes })),
  results,
}
await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const failures = results.filter((item) => item.status === 'failed')
const reviews = results.filter((item) => item.status === 'review')
console.log(JSON.stringify({ outputRoot, checks: results.length, failures: failures.length, reviews: reviews.length }, null, 2))
if (failures.length) process.exitCode = 1
