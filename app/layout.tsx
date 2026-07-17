import type { Metadata, Viewport } from 'next'
import { Montserrat, Rajdhani } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'Property Partners | Inteligencia de mercado Vitacura',
  description: 'Property Partners convierte datos dispersos, flujos comerciales y señales de IA en inteligencia operativa para ventas en Vitacura.',
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
