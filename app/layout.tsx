import type { Metadata, Viewport } from 'next'
import { Montserrat, Rajdhani } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'N3uralia | Turn complexity into intelligent execution',
  description: 'N3uralia converts scattered data, workflows, documents, and AI into operational intelligence for complex teams.',
  generator: 'N3uralia',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a1110',
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

