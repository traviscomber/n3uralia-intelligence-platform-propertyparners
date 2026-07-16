'use client'

import { useEffect, useRef, useState } from 'react' // useState used by Counter
import Link from 'next/link'
import { ArrowRight, BarChart3, TrendingUp, DollarSign } from 'lucide-react'

// Animated canvas background — floating data particles
function DataCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.offsetWidth
    let height = canvas.offsetHeight
    canvas.width = width
    canvas.height = height

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string }[] = []
    const colors = ['#8fb2aa', '#b89a7e', '#d8e5e2', '#10b981']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animId: number
    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(143,178,170,${0.12 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}





export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans" style={{ background: '#fbfbfa', color: '#173634' }}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(251,251,250,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #d8e5e2' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: '#8fb2aa' }}>N3</div>
            <div>
              <div className="font-semibold text-sm" style={{ color: '#173634' }}>N3uralia</div>
              <div className="text-xs" style={{ color: '#9ca9a3' }}>Plataforma Interna</div>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ background: '#8fb2aa' }}
          >
            Acceder <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ─── PARTE 1: HERO ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Animated canvas background */}
        <DataCanvas />

        {/* Left dark panel */}
        <div className="relative z-10 w-full grid md:grid-cols-2 min-h-screen">

          {/* LEFT — dark editorial */}
          <div className="flex flex-col justify-center px-10 py-24 md:py-0" style={{ background: '#173634' }}>
            <div style={{ animation: 'slideUp 0.9s ease-out both' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: '#8fb2aa' }}>
                N3uralia - Plataforma 2026
              </p>
              <h1 className="font-bold leading-none mb-8" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', color: '#fbfbfa' }}>
                Casas en Vitacura respaldadas por datos.
              </h1>
              <p className="text-lg leading-relaxed mb-10" style={{ color: '#9ca9a3', maxWidth: '38ch' }}>
                Automatizacion de reportes para CEO y directores, inteligencia de mercado por barrio en Vitacura, y un valorizador que pondera la calidad real de cada casa.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 hover:gap-4"
                style={{ background: '#8fb2aa', color: '#173634' }}
              >
                Ingresar a la plataforma <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* RIGHT — light panel with animated tech stack */}
          <div className="flex flex-col justify-center px-10 py-24 md:py-0 gap-6 relative" style={{ background: 'rgba(251,251,250,0.96)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#b89a7e' }}>
              La tecnologia detras
            </p>

            {[
              {
                  label: 'Pipeline de datos propio',
                  desc: 'Scraper de Portal Inmobiliario Vitacura + base de ventas internas + archivos KMZ que asignan barrio a cada casa. Todo integrado y actualizado trimestralmente.',
                color: '#8fb2aa',
                delay: '0ms',
                tag: 'Pipeline de datos',
              },
              {
                  label: 'Modelos predictivos',
                  desc: 'Regresion entrenada con 5 años de transacciones. El valorizador aprende a ponderar calidad, barrio y atributos especificos de cada inmueble.',
                color: '#b89a7e',
                delay: '120ms',
                tag: 'IA predictiva',
              },
              {
                  label: '3 directores + equipos',
                  desc: 'El sistema genera el reporte mensual para el CEO y reportes semanales para los 3 directores automaticamente. Sin Excel, sin armado manual.',
                color: '#10b981',
                delay: '240ms',
                tag: 'Reportes automaticos',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="group p-5 rounded-xl transition-all cursor-default"
                style={{
                  border: '1px solid #d8e5e2',
                  background: 'white',
                  animation: `slideUp 0.7s ease-out ${item.delay} both`,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#d8e5e2')}
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-xs font-bold" style={{ background: item.color }}>
                    {item.tag.split(' ')[0].slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm" style={{ color: '#173634' }}>{item.label}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: item.color + '22', color: item.color }}>{item.tag}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#555a56' }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTE 2: 3 PILARES ─── */}
      <section className="py-28" style={{ background: '#fbfbfa' }}>
        <div className="max-w-6xl mx-auto px-6">

          {/* Section header */}
          <div className="mb-20" style={{ animation: 'slideUp 0.8s ease-out 0.1s both' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8fb2aa' }}>Lo que construimos</p>
            <h2 className="font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#173634', maxWidth: '22ch' }}>
              Tres herramientas para tomar decisiones con datos reales.
            </h2>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-20 pb-20"
            style={{ borderBottom: '1px solid #d8e5e2', animation: 'slideUp 0.8s ease-out 0.2s both' }}
          >
            {[
              { value: 5, suffix: ' años', label: 'de histórico en datos' },
              { value: 12, suffix: '', label: 'sectores principales cubiertos' },
              { value: 2800, suffix: '+', label: 'casas analizadas en Vitacura' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-4xl md:text-5xl font-bold" style={{ color: '#173634' }}>
                  {s.value.toLocaleString('es-CL')}{s.suffix}
                </div>
                <div className="text-xs md:text-sm mt-2" style={{ color: '#9ca9a3' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* 3 Pilares */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pilar 1 */}
            <div
              className="group p-8 rounded-2xl cursor-default"
              style={{ border: '1px solid #d8e5e2', background: 'white', animation: 'slideUp 0.7s ease-out 0.3s both', transition: 'box-shadow 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(143,178,170,0.22)'; e.currentTarget.style.borderColor = '#8fb2aa' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#d8e5e2' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6" style={{ background: '#8fb2aa' }}>
                <BarChart3 size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8fb2aa' }}>Pilar 01</div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#173634' }}>Reportes automaticos</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#555a56' }}>
                Los directores reciben sus reportes semanales sin tener que armarlos. El sistema actualiza automaticamente con los ultimos datos de ventas, comisiones y evolucion versus plan.
              </p>
              <div className="space-y-2.5">
                {['Reportes semanales para directores', 'Actualizacion automatica cada lunes', 'Avance real versus meta', 'Sin intervencion manual'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs" style={{ color: '#555a56' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#8fb2aa' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Pilar 2 */}
            <div
              className="group p-8 rounded-2xl cursor-default"
              style={{ border: '1px solid #d8e5e2', background: 'white', animation: 'slideUp 0.7s ease-out 0.45s both', transition: 'box-shadow 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(184,154,126,0.22)'; e.currentTarget.style.borderColor = '#b89a7e' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#d8e5e2' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6" style={{ background: '#b89a7e' }}>
                <TrendingUp size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#b89a7e' }}>Pilar 02</div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#173634' }}>Inteligencia de mercado Vitacura</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#555a56' }}>
                Analisis de mercado en tiempo real por barrio en Vitacura. Entiendes que barrios venden rapido, a que precio, y como evolucionar la estrategia segun el contexto.
              </p>
              <div className="space-y-2.5">
                {['Velocidad de venta por barrio', 'Precio actual UF/m²', 'Tendencias de mercado', 'Datos actualizados regularmente'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs" style={{ color: '#555a56' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#b89a7e' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Pilar 3 */}
            <div
              className="group p-8 rounded-2xl cursor-default"
              style={{ border: '1px solid #d8e5e2', background: 'white', animation: 'slideUp 0.7s ease-out 0.6s both', transition: 'box-shadow 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(16,185,129,0.18)'; e.currentTarget.style.borderColor = '#10b981' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#d8e5e2' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6" style={{ background: '#10b981' }}>
                <DollarSign size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#10b981' }}>Pilar 03</div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#173634' }}>Valorizador inteligente</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#555a56' }}>
                Precios exactos segun calidad y estado del inmueble. No es solo barrio y metros cuadrados - el sistema ajusta por terminaciones, conservacion y otros factores que importan.
              </p>
              <div className="space-y-2.5">
                {['Ajuste por calidad de terminaciones', 'Sensibilización por estado', 'Precio por barrio específico', 'Valorización instantánea'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs" style={{ color: '#555a56' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-28" style={{ background: '#173634' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8fb2aa' }}>Listo para usar</p>
            <h2 className="text-3xl font-bold leading-tight" style={{ color: '#fbfbfa' }}>
              Tu plataforma ya está activa.
            </h2>
            <p className="mt-3 text-sm" style={{ color: '#9ca9a3' }}>Todo el equipo de N3uralia tiene acceso.</p>
          </div>
          <Link
            href="/auth/login"
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-sm whitespace-nowrap transition-all hover:opacity-90 hover:scale-105"
            style={{ background: '#8fb2aa', color: '#173634' }}
          >
            Acceder ahora <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: '#111e1d', borderTop: '1px solid #1e2e2d' }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: '#8fb2aa' }}>N3</div>
            <span className="text-xs" style={{ color: '#555a56' }}>N3uralia Platform</span>
          </div>
          <span className="text-xs" style={{ color: '#555a56' }}>Powered by N3uralia &mdash; 2026</span>
        </div>
      </footer>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
