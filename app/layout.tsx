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
  colorScheme: 'dark',
  themeColor: '#0a0c12',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="bg-[#0a0c12]" style={{ fontFamily: inter.style.fontFamily }}>
      <body className="antialiased" style={{ background: '#0a0c12', color: '#f0f2ff' }}>
        {children}
      </body>
    </html>
  )
}
