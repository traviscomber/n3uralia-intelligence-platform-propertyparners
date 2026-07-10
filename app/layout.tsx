import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'N3uralia — Inteligencia Inmobiliaria',
  description: 'Plataforma de inteligencia ejecutiva para inmobiliarias de alto rendimiento.',
  generator: 'N3uralia',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#8fb2aa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" style={{ fontFamily: inter.style.fontFamily }}>
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}
