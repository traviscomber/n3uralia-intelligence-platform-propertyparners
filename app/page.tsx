'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#d8e5e2' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: '#8fb2aa' }}>
              N3
            </div>
            <span className="font-bold text-lg text-gray-900">N3uralia</span>
          </div>
          <Link
            href="/auth/login"
            className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            style={{ background: '#8fb2aa' }}
          >
            Acceder
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold mb-4" style={{ color: '#8fb2aa' }}>Para immobiliarias que venden más</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Tu mejor vendedor es la IA
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            N3uralia analiza el mercado inmobiliario chileno en tiempo real. Valorizaciones precisas, seguimiento de conversiones, predicciones de ventas. Todo lo que necesitas para vender más, en un solo lugar.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/dashboard"
              className="px-7 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              style={{ background: '#8fb2aa' }}
            >
              Ver en acción <ArrowRight size={20} />
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-7 py-3 rounded-lg font-medium transition-opacity"
              style={{ border: '1px solid #d8e5e2', color: '#173634', background: '#f5f9f7' }}
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-16 text-center">3 problemas que resolvemos</h2>
        <div className="space-y-12">
          {/* Problem 1 */}
          <div className="flex gap-8 items-start">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: '#8fb2aa' }}>1</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">¿A qué precio vendo?</h3>
              <p className="text-gray-600 mb-3">Cada propiedad es única. N3uralia analiza ubicación, tamaño, estado, y comparables del mercado en tiempo real. Te da el precio justo: ni regalas, ni pierdes clientes.</p>
              <p className="text-sm font-semibold" style={{ color: '#8fb2aa' }}>Resultado: 88% de precisión en valuaciones</p>
            </div>
          </div>

          {/* Problem 2 */}
          <div className="flex gap-8 items-start">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: '#b89a7e' }}>2</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">¿Cómo controlo el equipo?</h3>
              <p className="text-gray-600 mb-3">Tu directora de ventas está tomando demasiados días por propiedad. Un vendedor no cierra nunca. El mercado cambió. N3uralia monitorea cada métrica en tiempo real y te alerta cuando algo se desvía del plan.</p>
              <p className="text-sm font-semibold" style={{ color: '#b89a7e' }}>Resultado: Control total en un dashboard intuitivo</p>
            </div>
          </div>

          {/* Problem 3 */}
          <div className="flex gap-8 items-start">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: '#10b981' }}>3</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">¿Qué está pasando en el mercado?</h3>
              <p className="text-gray-600 mb-3">Cada barrio es diferente. Cada mes cambia. Necesitas saber qué está vendiendo, a qué velocidad, a qué precio. N3uralia te da la inteligencia de mercado que necesitas para no quedarte atrás.</p>
              <p className="text-sm font-semibold" style={{ color: '#10b981' }}>Resultado: Market intelligence automática</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-2">12K+</div>
          <div className="text-sm text-gray-600">Propiedades analizadas</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-2">88%</div>
          <div className="text-sm text-gray-600">Precisión IA</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-2">24/7</div>
          <div className="text-sm text-gray-600">Monitoreo automático</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900 mb-2">7</div>
          <div className="text-sm text-gray-600">Fuentes de datos</div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Comienza ahora. Gratis.</h2>
        <p className="text-gray-600 mb-8">Sin tarjeta de crédito. Acceso completo a todas las funciones.</p>
        <Link
          href="/auth/sign-up"
          className="inline-block px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#8fb2aa' }}
        >
          Crear cuenta
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p>&copy; 2026 N3uralia. Plataforma de inteligencia inmobiliaria para Chile.</p>
        </div>
      </footer>
    </div>
  )
}
