import type { Metadata, Viewport } from 'next'
import './globals.css'
import './semantic-tokens.css'

export const metadata: Metadata = {
  title: 'Property Partners Vitacura | Inteligencia de mercado',
  description: 'Control de gestion e inteligencia de mercado para ventas de casas y departamentos en Vitacura. Powered by N3uralia.',
  generator: 'N3uralia',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050505',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="font-sans">
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  )
}
