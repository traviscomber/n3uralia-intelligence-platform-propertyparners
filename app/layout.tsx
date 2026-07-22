import type { Metadata, Viewport } from 'next'
import { Montserrat, Rajdhani } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'Property Partners Vitacura | Inteligencia de mercado',
  description: 'Control de gestion e inteligencia de mercado para ventas de casas y departamentos en Vitacura. Powered by N3uralia.',
  generator: 'N3uralia',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050505',
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

