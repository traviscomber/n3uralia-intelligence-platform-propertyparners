import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer'

const baseUrl = process.env.QA_BASE_URL || 'https://n3uralia-intelligence-platform.vercel.app'
const outputRoot = path.resolve(process.env.QA_OUTPUT_DIR || 'artifacts/visual-qa')
const sharedPassword = process.env.QA_PASSWORD || null

const profiles = [
  {
    key: 'ceo',
    email: process.env.QA_CEO_EMAIL,
    password: process.env.QA_CEO_PASSWORD || sharedPassword,
    start: '/dashboard/ceo',
  },
  {
    key: 'director',
    email: process.env.QA_DIRECTOR_EMAIL,
    password: process.env.QA_DIRECTOR_PASSWORD || sharedPassword,
    start: '/dashboard/director',
  },
  {
    key: 'lo-beltran',
    email: process.env.QA_LO_BELTRAN_EMAIL,
    password: process.env.QA_LO_BELTRAN_PASSWORD || sharedPassword,
    start: '/dashboard/partner',
  },
  {
    key: 'nueva-costanera',
    email: process.env.QA_NUEVA_COSTANERA_EMAIL,
    password: process.env.QA_NUEVA_COSTANERA_PASSWORD || sharedPassword,
    start: '/dashboard/partner',
  },
  {
    key: 'santa-maria',
    email: process.env.QA_SANTA_MARIA_EMAIL,
    password: process.env.QA_SANTA_MARIA_PASSWORD || sharedPassword,
    start: '/dashboard/partner',
  },
].filter((item) => item.email)

const viewports = [
  { key: 'desktop', width: 1440, height: 1000 },
  { key: 'tablet', width: 820, height: 1180 },
  { key: 'mobile', width: 390, height: 844 },
]

if (!profiles.length) throw new Error('At least one QA_*_EMAIL variable is required.')
for (const profile of profiles) {
  if (!profile.password) throw new Error(`Missing password for QA profile ${profile.key}.`)
}

await fs.mkdir(outputRoot, { recursive: true })

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const results = []

async function waitForAuthenticatedState(page) {
  await Promise.race([
    page.waitForFunction(() => !window.location.pathname.startsWith('/auth/login'), { timeout: 30000 }),
    page.waitForSelector('[role="alert"]', { timeout: 30000 }),
  ]).catch(() => null)

  const state = await page.evaluate(() => ({
    pathname: window.location.pathname,
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() || null,
  }))

  if (state.pathname.startsWith('/auth/login')) {
    throw new Error(state.alert || 'Authentication did not leave the login page.')
  }
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
  const emailInput = await page.$('input[type="email"], input[name="email"]')
  const passwordInput = await page.$('input[type="password"], input[name="password"]')
  if (!emailInput || !passwordInput) throw new Error('Login form fields were not found.')

  await emailInput.click({ clickCount: 3 })
  await emailInput.type(email)
  await passwordInput.click({ clickCount: 3 })
  await passwordInput.type(password)
  await page.click('button[type="submit"]')
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
      const text = (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        element.getAttribute('placeholder') ||
        ''
      ).trim()
      return !text
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

try {
  for (const profile of profiles) {
    const contextDir = path.join(outputRoot, profile.key)
    await fs.mkdir(contextDir, { recursive: true })
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)

    const browserErrors = []
    page.on('pageerror', (error) => browserErrors.push(String(error)))
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text())
    })

    try {
      await login(page, profile.email, profile.password)
      await page.goto(`${baseUrl}${profile.start}`, { waitUntil: 'networkidle2' })

      if (page.url().includes('/auth/')) throw new Error(`Protected route redirected to ${page.url()}.`)

      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 })
        await page.reload({ waitUntil: 'networkidle2' })
        const screenshotPath = path.join(contextDir, `${viewport.key}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        const signals = await collectAccessibilitySignals(page)
        results.push({
          profile: profile.key,
          viewport: viewport.key,
          url: page.url(),
          status: signals.horizontalOverflow || signals.unnamedFocusableCount > 0 || signals.h1Count !== 1 ? 'review' : 'captured',
          screenshot: path.relative(outputRoot, screenshotPath),
          ...signals,
        })
      }

      await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
      await page.goto(`${baseUrl}${profile.start}`, { waitUntil: 'networkidle2' })
      const focusTrail = []
      for (let index = 0; index < 12; index += 1) {
        await page.keyboard.press('Tab')
        focusTrail.push(await page.evaluate(() => ({
          tag: document.activeElement?.tagName || null,
          text: (
            document.activeElement?.getAttribute('aria-label') ||
            document.activeElement?.textContent ||
            ''
          ).trim().slice(0, 120),
        })))
      }
      results.push({
        profile: profile.key,
        check: 'keyboard',
        status: focusTrail.some((item) => item.tag) ? 'observed' : 'failed',
        focusTrail,
      })

      const reportLink = await page.$('a[href*="/report"]')
      if (reportLink) {
        const href = await page.evaluate((element) => element.getAttribute('href'), reportLink)
        if (href) {
          await page.goto(new URL(href, baseUrl).toString(), { waitUntil: 'networkidle2' })
          const pdfPath = path.join(contextDir, 'valuation-report.pdf')
          await page.pdf({ path: pdfPath, format: 'A4', printBackground: true })
          const stat = await fs.stat(pdfPath)
          results.push({
            profile: profile.key,
            check: 'pdf',
            status: stat.size > 1000 ? 'generated' : 'failed',
            bytes: stat.size,
            file: path.relative(outputRoot, pdfPath),
            url: page.url(),
          })
        }
      } else {
        results.push({ profile: profile.key, check: 'pdf', status: 'not-available-on-start-page' })
      }

      results.push({
        profile: profile.key,
        check: 'browser-errors',
        status: browserErrors.length ? 'review' : 'clean',
        errors: browserErrors.slice(0, 20),
      })
    } catch (error) {
      results.push({
        profile: profile.key,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        url: page.url(),
      })
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  note: 'Automated evidence only. Manual screen-reader, contrast review and business acceptance remain separate.',
  profiles: profiles.map(({ key, email, start }) => ({ key, email, start })),
  results,
}
await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const failures = results.filter((item) => item.status === 'failed')
const reviews = results.filter((item) => item.status === 'review')
console.log(JSON.stringify({ outputRoot, checks: results.length, failures: failures.length, reviews: reviews.length }, null, 2))
if (failures.length) process.exitCode = 1
