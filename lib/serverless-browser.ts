import type { Browser } from 'puppeteer-core'
import { resolvePortalProxy } from '@/lib/portal-proxy'

export async function launchServerlessBrowser(): Promise<Browser> {
  const { default: puppeteer } = await import('puppeteer-core')
  const systemChrome = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH

  if (systemChrome) {
    return puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1440, height: 1000 },
      executablePath: systemChrome,
      headless: true,
    })
  }

  const { default: chromium } = await import('@sparticuz/chromium')
  chromium.setGraphicsMode = false
  const args = await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' })
  const executablePath = await chromium.executablePath()

  return puppeteer.launch({
    args: [
      ...args,
      '--disable-blink-features=AutomationControlled',
      '--lang=es-CL,es',
      '--window-size=1440,1000',
    ],
    defaultViewport: { width: 1440, height: 1000 },
    executablePath,
    headless: 'shell',
  })
}
