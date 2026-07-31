import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer'

const baseUrl = process.env.QA_BASE_URL || 'https://n3uralia-intelligence-platform.vercel.app'
const outputRoot = path.resolve(process.env.QA_OUTPUT_DIR || 'artifacts/visual-qa')
const password = process.env.QA_PASSWORD

const profiles = [
  { key: 'ceo', email: process.env.QA_CEO_EMAIL, start: '/dashboard/ceo' },
  { key: 'director', email: process.env.QA_DIRECTOR_EMAIL, start: '/dashboard/director' },
  { key: 'lo-beltran', email: process.env.QA_LO_BELTRAN_EMAIL, start: '/dashboard/partner' },
  { key: 'nueva-costanera', email: process.env.QA_NUEVA_COSTANERA_EMAIL, start: '/dashboard/partner' },
  { key: 'santa-maria', email: process.env.QA_SANTA_MARIA_EMAIL, start: '/dashboard/partner' },
].filter((item) => item.email)

const viewports = [
  { key: 'desktop', width: 1440, height: 1000 },
  { key: 'tablet', width: 820, height: 1180 },
  { key: 'mobile', width: 390, height: 844 },
]

if (!password) throw new Error('QA_PASSWORD is required.')
if (!profiles.length) throw new Error('At least one QA_*_EMAIL variable is required.')

await fs.mkdir(outputRoot, { recursive: true })

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
const results = []

async function login(page, email) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
  const emailInput = await page.$('input[type="email"], input[name="email"]')
  const passwordInput = await page.$('input[type="password"], input[name="password"]')
  if (!emailInput || !passwordInput) throw new Error('Login form fields were not found.')
  await emailInput.type(email)
  await passwordInput.type(password)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]'),
  ])
}

async function collectAccessibilitySignals(page) {
  return page.evaluate(() => {
    const focusables = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    const unnamed = focusables.filter((element) => {
      const text = (element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').trim()
      return !text
    }).length
    const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    return {
      title: document.title,
      h1Count: document.querySelectorAll('h1').length,
      focusableCount: focusables.length,
      unnamedFocusableCount: unnamed,
      horizontalOverflow,
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

    try {
      await login(page, profile.email)
      await page.goto(`${baseUrl}${profile.start}`, { waitUntil: 'networkidle2' })

      for (const viewport of viewports) {
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 })
        await page.reload({ waitUntil: 'networkidle2' })
        const screenshotPath = path.join(contextDir, `${viewport.key}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        const signals = await collectAccessibilitySignals(page)
        results.push({ profile: profile.key, viewport: viewport.key, url: page.url(), status: 'captured', ...signals })
      }

      await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
      await page.goto(`${baseUrl}${profile.start}`, { waitUntil: 'networkidle2' })
      for (let index = 0; index < 12; index += 1) await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => ({
        tag: document.activeElement?.tagName || null,
        text: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 120),
      }))
      results.push({ profile: profile.key, check: 'keyboard', status: focused.tag ? 'observed' : 'failed', focused })

      const reportLink = await page.$('a[href*="/report"]')
      if (reportLink) {
        const href = await page.evaluate((element) => element.getAttribute('href'), reportLink)
        if (href) {
          await page.goto(new URL(href, baseUrl).toString(), { waitUntil: 'networkidle2' })
          await page.pdf({ path: path.join(contextDir, 'valuation-report.pdf'), format: 'A4', printBackground: true })
          results.push({ profile: profile.key, check: 'pdf', status: 'generated', url: page.url() })
        }
      } else {
        results.push({ profile: profile.key, check: 'pdf', status: 'not-available-on-start-page' })
      }
    } catch (error) {
      results.push({ profile: profile.key, status: 'failed', error: error instanceof Error ? error.message : String(error) })
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
  note: 'Automated evidence only. Manual screen-reader and business acceptance remain separate.',
  results,
}
await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const failures = results.filter((item) => item.status === 'failed')
console.log(JSON.stringify({ outputRoot, checks: results.length, failures: failures.length }, null, 2))
if (failures.length) process.exitCode = 1
