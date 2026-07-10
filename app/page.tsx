'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, TrendingUp, DollarSign, Zap, Database, Brain } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.8s ease-out forwards; }
        .animate-slide-in-right { animation: slideInRight 0.8s ease-out forwards; }
        .animate-pulse-subtle { animation: pulse-subtle 3s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .tech-card {
          transition: all 0.3s ease;
        }
        .tech-card:hover {
          transform: translateY(-4px);
        }
      `}</style>

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

      {/* PARTE 1: HERO + TECNOLOGÍA IA */}
      <section className="min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-32 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Hero */}
            <div className="animate-slide-in-left">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Inteligencia que genera resultados
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Property Partners utiliza machine learning para transformar datos inmobiliarios en decisiones inteligentes. Automatización real, no promesas.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                style={{ background: '#8fb2aa' }}
              >
                Acceder a la plataforma <ArrowRight size={18} className="inline ml-2" />
              </Link>
            </div>

            {/* Right: Technology Explanation */}
            <div className="animate-slide-in-right space-y-6">
              <div className="tech-card p-6 rounded-lg" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 animate-pulse-subtle" style={{ background: '#8fb2aa' }}>
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Datos en tiempo real</h3>
                    <p className="text-sm text-gray-600">Conectamos Vitacura, ventas internas y datos geo-ubicados. Información fresca cada trimestre.</p>
                  </div>
                </div>
              </div>

              <div className="tech-card p-6 rounded-lg" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 animate-pulse-subtle delay-100" style={{ background: '#b89a7e' }}>
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Machine Learning avanzado</h3>
                    <p className="text-sm text-gray-600">Modelos entrenados con histórico de ventas. Aprenden de cada transacción inmobiliaria.</p>
                  </div>
                </div>
              </div>

              <div className="tech-card p-6 rounded-lg" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 animate-pulse-subtle delay-200" style={{ background: '#10b981' }}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Automatización inteligente</h3>
                    <p className="text-sm text-gray-600">Reportes generados sin intervención. Alertas predictivas antes de que sea demasiado tarde.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARTE 2: LOS 3 PILARES OPERACIONALES */}
      <section className="py-32" style={{ background: '#fbfbfa' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Tu operación, potenciada por IA</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tres pilares que transforman cómo Property Partners gestiona, mide y crece
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pilar 1 */}
            <div className="animate-fade-in-up p-8 rounded-lg" style={{ border: '1px solid #d8e5e2', background: 'white' }}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white mb-6 flex-shrink-0 animate-float" style={{ background: '#8fb2aa' }}>
                <BarChart3 size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Reportes Automáticos</h3>
              <p className="text-gray-600 mb-6">
                Mensuales para el CEO. Semanales para directores. Sin Excel, sin manuales. Control de gestión que se actualiza solo.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#8fb2aa' }}>•</span>
                  Ventas por ejecutivo
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#8fb2aa' }}>•</span>
                  Desviaciones versus plan
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#8fb2aa' }}>•</span>
                  Comisiones y KPIs
                </li>
              </ul>
            </div>

            {/* Pilar 2 */}
            <div className="animate-fade-in-up delay-100 p-8 rounded-lg" style={{ border: '1px solid #d8e5e2', background: 'white' }}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white mb-6 flex-shrink-0 animate-float" style={{ background: '#b89a7e', animationDelay: '0.5s' }}>
                <TrendingUp size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Market Intelligence</h3>
              <p className="text-gray-600 mb-6">
                Datos de Vitacura + ventas propias + barrios geo-ubicados. Entiende el mercado como nunca.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#b89a7e' }}>•</span>
                  Velocidad de venta por barrio
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#b89a7e' }}>•</span>
                  Precios promedios y evolución
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#b89a7e' }}>•</span>
                  Historia de 5 años
                </li>
              </ul>
            </div>

            {/* Pilar 3 */}
            <div className="animate-fade-in-up delay-200 p-8 rounded-lg" style={{ border: '1px solid #d8e5e2', background: 'white' }}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white mb-6 flex-shrink-0 animate-float" style={{ background: '#10b981', animationDelay: '1s' }}>
                <DollarSign size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Valorizador Inteligente</h3>
              <p className="text-gray-600 mb-6">
                Valuaciones sensibilizadas por calidad, estado y características específicas. Precisión en segundos.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#10b981' }}>•</span>
                  Factores de calidad
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#10b981' }}>•</span>
                  Sensibilidad por barrio
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span style={{ color: '#10b981' }}>•</span>
                  Estimaciones confiables
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 animate-fade-in-up">
          Accede ahora a tu plataforma
        </h2>
        <p className="text-gray-600 mb-8 animate-fade-in-up delay-100">
          Todo el equipo de Property Partners ya tiene acceso.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-8 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity animate-fade-in-up delay-200"
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
