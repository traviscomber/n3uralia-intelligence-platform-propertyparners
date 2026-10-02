import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const baseUrl = process.env.QA_BASE_URL || 'https://ppartnersgroup.app'
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

async function captureLoginDiagnostic(page, profileKey, contextDir, reason) {
  const screenshotPath = path.join(contextDir, 'login-diagnostic.png')
  const htmlPath = path.join(contextDir, 'login-diagnostic.html')
  const metaPath = path.join(contextDir, 'login-diagnostic.json')
  const [html, meta] = await Promise.all([
    page.content().catch(() => ''),
    page.evaluate(() => ({
      title: document.title,
      pathname: window.location.pathname,
      readyState: document.readyState,
      bodyText: document.body?.innerText?.trim().slice(0, 1200) || '',
      inputs: [...document.querySelectorAll('input')].map((input) => ({
        id: input.id || null,
        name: input.getAttribute('name'),
        type: input.getAttribute('type'),
        placeholder: input.getAttribute('placeholder'),
      })),
      buttons: [...document.querySelectorAll('button')].map((button) => ({
        type: button.getAttribute('type'),
        text: button.textContent?.trim().slice(0, 120) || '',
      })),
    })).catch(() => ({ title: '', pathname: '', readyState: '', bodyText: '', inputs: [], buttons: [] })),
  ])
  await Promise.all([
    page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => null),
    fs.writeFile(htmlPath, html || '<!-- unavailable -->').catch(() => null),
    fs.writeFile(metaPath, `${JSON.stringify({ profileKey, reason, url: page.url(), ...meta }, null, 2)}\n`).catch(() => null),
  ])
}

async function login(page, profileKey, contextDir, email, password) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete', { timeout: 15000 }).catch(() => null)

  const emailSelector = '#email, input[type="email"], input[name="email"]'
  const passwordSelector = '#password, input[type="password"], input[name="password"]'

  try {
    await Promise.all([
      page.waitForSelector(emailSelector, { visible: true, timeout: 15000 }),
      page.waitForSelector(passwordSelector, { visible: true, timeout: 15000 }),
    ])
  } catch {
    await captureLoginDiagnostic(page, profileKey, contextDir, 'Login form fields were not found after waiting for visible inputs.')
    throw new Error('Login form fields were not found after waiting for the rendered form.')
  }

  const emailInput = await page.$(emailSelector)
  const passwordInput = await page.$(passwordSelector)
  const submitButton = await page.$('button[type="submit"]')
  if (!emailInput || !passwordInput || !submitButton) {
    await captureLoginDiagnostic(page, profileKey, contextDir, 'Login controls incomplete.')
    throw new Error('Login controls were incomplete.')
  }

  await emailInput.click({ clickCount: 3 })
  await emailInput.type(email)
  await passwordInput.click({ clickCount: 3 })
  await passwordInput.type(password)
  await submitButton.click()
  await waitForAuthenticatedState(page)
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
    await login(page, profile.key, contextDir, profile.email, profile.password)

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
