'use client'

import Link from 'next/link'
import { Building2, TrendingUp, Brain, BarChart3, Zap, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #8fb2aa 0%, #b89a7e 100%)' }}>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Inteligencia Inmobiliaria de Next-Gen
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Plataforma impulsada por IA que transforma datos de mercado en decisiones comerciales precisas. Control de gestión, valorizaciones automáticas y market intelligence en tiempo real.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            style={{ background: '#8fb2aa' }}
          >
            Ver Dashboard <ArrowRight size={20} />
          </Link>
          <Link
            href="/auth/sign-up"
            className="px-8 py-3 rounded-lg font-medium hover:opacity-70 transition-opacity"
            style={{ border: '1px solid #d8e5e2', color: '#173634', background: '#f5f9f7' }}
          >
            Crear Cuenta
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Capacidades</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: 'Valorizador IA',
              desc: 'Estima precios de propiedades con precisión usando machine learning y datos de mercado.',
            },
            {
              icon: BarChart3,
              title: 'Control de Gestión',
              desc: 'Monitorea KPIs en tiempo real: ventas, comisiones, velocidad de venta y conversiones.',
            },
            {
              icon: TrendingUp,
              title: 'Market Intelligence',
              desc: 'Análisis de tendencias por barrio, absorción de inventario y precios competitivos.',
            },
            {
              icon: Zap,
              title: 'Reportes IA',
              desc: 'Genera reportes ejecutivos automáticos con insights y recomendaciones estratégicas.',
            },
            {
              icon: Building2,
              title: 'Base de Conocimiento',
              desc: 'Biblioteca centralizada de documentos, comparables y análisis de mercado.',
            },
            {
              icon: BarChart3,
              title: 'Fuentes de Datos',
              desc: 'Pipeline integrado que sincroniza datos de múltiples fuentes en tiempo real.',
            },
          ].map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="bg-white p-6 rounded-lg transition-colors" style={{ border: '1px solid #d8e5e2', borderColor: '#d8e5e2' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8fb2aa'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d8e5e2'}>
                <Icon className="w-12 h-12 mb-4" style={{ color: '#8fb2aa' }} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="text-white py-16" style={{ background: 'linear-gradient(90deg, #8fb2aa 0%, #b89a7e 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '7', label: 'Fuentes de Datos' },
              { number: '12K+', label: 'Propiedades Analizadas' },
              { number: '88%', label: 'Precisión IA' },
              { number: '24/7', label: 'Monitoreo en Tiempo Real' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">¿Listo para revolucionar tu inmobiliaria?</h2>
        <p className="text-lg text-gray-600 mb-8">
          Únete a las inmobiliarias chilenas que usan N3uralia para tomar decisiones más inteligentes.
        </p>
        <Link
          href="/auth/sign-up"
          className="inline-block px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#8fb2aa' }}
        >
          Comenzar Ahora
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Producto</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Características</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Precios</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Compañía</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">Acerca de</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Términos</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookies</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contacto</h3>
              <p>Email: info@n3uralia.com</p>
              <p>Tel: +56 9 XXXX XXXX</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p>&copy; 2026 N3uralia. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
