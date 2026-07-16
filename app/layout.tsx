import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Property Partners Vitacura | N3uralia',
  description: 'Plataforma de inteligencia comercial para ventas de casas en Vitacura.',
  generator: 'N3uralia',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#d61f2c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      style={{
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}
