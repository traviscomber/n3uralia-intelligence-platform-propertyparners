import type { Browser } from 'puppeteer-core'

export async function launchServerlessBrowser(): Promise<Browser> {
  const [{ default: puppeteer }, { default: chromium }] = await Promise.all([
    import('puppeteer-core'),
    import('@sparticuz/chromium'),
  ])

  chromium.setGraphicsMode = false
  const args = await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' })
  const executablePath = await chromium.executablePath()

  return puppeteer.launch({
    args,
    defaultViewport: { width: 1440, height: 1000 },
    executablePath,
    headless: 'shell',
  })
}
