'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, TrendingUp, DollarSign } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#d8e5e2' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: '#8fb2aa' }}>
              N3
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900">Property Partners</div>
              <div className="text-xs" style={{ color: '#9ca9a3' }}>Plataforma</div>
            </div>
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
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Inteligencia operacional para Property Partners
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed">
            Reportes automáticos, market intelligence y valorización inteligente. Todo lo que necesitas para gestionar, medir y crecer.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            style={{ background: '#8fb2aa' }}
          >
            Ingresar a la plataforma <ArrowRight size={18} className="inline ml-2" />
          </Link>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-16 text-center">3 pilares de operación</h2>
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Pilar 1: Reportes */}
          <div className="p-8 rounded-lg" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 flex-shrink-0" style={{ background: '#8fb2aa' }}>
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Reportes Automáticos</h3>
            <p className="text-gray-600 mb-6">
              Reportes mensuales para el CEO. Reportes semanales para directores. Control de gestión que se actualiza automáticamente.
            </p>
            <p className="text-sm font-semibold" style={{ color: '#8fb2aa' }}>
              Sin Excel. Sin manual. Siempre actualizado.
            </p>
          </div>

          {/* Pilar 2: Market Intelligence */}
          <div className="p-8 rounded-lg" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 flex-shrink-0" style={{ background: '#b89a7e' }}>
              <TrendingUp size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Market Intelligence</h3>
            <p className="text-gray-600 mb-6">
              Datos de Vitacura, ventas propias y barrios geo-ubicados. Velocidad de venta, precios promedios, evolución de 5 años.
            </p>
            <p className="text-sm font-semibold" style={{ color: '#b89a7e' }}>
              Actualizado trimestralmente.
            </p>
          </div>

          {/* Pilar 3: Valorizador */}
          <div className="p-8 rounded-lg" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 flex-shrink-0" style={{ background: '#10b981' }}>
              <DollarSign size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Valorizador Inteligente</h3>
            <p className="text-gray-600 mb-6">
              Valuación sensibilizada por calidad, estado y características específicas del inmueble.
            </p>
            <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
              Estimaciones precisas en segundos.
            </p>
          </div>
        </div>
      </section>

      {/* Para Directores */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Seguimiento semanal para directores</h2>
          <p className="text-gray-600 mb-4">
            Cada lunes tienes tu reporte de la semana anterior. Ventas, conversiones, velocidad de venta, comisiones. Todo automatizado.
          </p>
          <p className="text-gray-600">
            Tomas decisiones basado en datos reales. Sabes exactamente dónde estás versus el plan.
          </p>
        </div>
        <div className="bg-white rounded-lg p-8" style={{ border: '1px solid #d8e5e2' }}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#8fb2aa' }}>✓</div>
              <span className="text-gray-700">Ventas por ejecutivo</span>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#8fb2aa' }}>✓</div>
              <span className="text-gray-700">Velocidad de venta semanal</span>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#8fb2aa' }}>✓</div>
              <span className="text-gray-700">Conversión por barrio</span>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#8fb2aa' }}>✓</div>
              <span className="text-gray-700">Desviaciones versus plan</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Accede ahora a tu plataforma</h2>
        <p className="text-gray-600 mb-8">Todo el equipo de Property Partners tiene acceso.</p>
        <Link
          href="/auth/login"
          className="inline-block px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#8fb2aa' }}
        >
          Ingresar
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p>Property Partners Platform | Powered by N3uralia</p>
        </div>
      </footer>
    </div>
  )
}
