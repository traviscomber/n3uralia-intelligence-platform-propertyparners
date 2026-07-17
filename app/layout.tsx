import type { Metadata, Viewport } from 'next'
import { Montserrat, Rajdhani } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'Property Partners | Intelligence layer for complex operations',
  description: 'Property Partners helps companies turn scattered data, workflows, documents, and AI into systems that improve visibility, control, and execution.',
  generator: 'Property Partners',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#d61f2c',
}

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-rajdhani',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-montserrat',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${rajdhani.variable} ${montserrat.variable}`}>
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  )
}

