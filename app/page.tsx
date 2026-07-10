'use client'

import { useEffect, useRef, useState } from 'react'
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

// Animated counter
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        let start = 0
        const duration = 1600
        const step = (timestamp: number) => {
          if (!start) start = timestamp
          const progress = Math.min((timestamp - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * target))
          if (progress < 1) requestAnimationFrame(step)
          else setCount(target)
        }
        requestAnimationFrame(step)
        observer.disconnect()
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count.toLocaleString('es-CL')}{suffix}</span>
}

// Intersection observer hook for scroll animations
function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Check if already in viewport on mount
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) { setInView(true); return }
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

export default function LandingPage() {
  const part2 = useInView(0.1)
  const p1 = useInView(0.2)
  const p2 = useInView(0.2)
  const p3 = useInView(0.2)
  const stats = useInView(0.3)

  return (
    <div className="min-h-screen font-sans" style={{ background: '#fbfbfa', color: '#173634' }}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(251,251,250,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #d8e5e2' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: '#8fb2aa' }}>N3</div>
            <div>
              <div className="font-semibold text-sm" style={{ color: '#173634' }}>Property Partners</div>
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
                Property Partners — Plataforma 2026
              </p>
              <h1 className="font-bold leading-none mb-8" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', color: '#fbfbfa' }}>
                Decisiones inmobiliarias respaldadas por datos.
              </h1>
              <p className="text-lg leading-relaxed mb-10" style={{ color: '#9ca9a3', maxWidth: '38ch' }}>
                Automatización de reportes para CEO y directores, inteligencia de mercado por barrio en Vitacura, y un valorizador que pondera la calidad real de cada propiedad.
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
              La tecnología detrás
            </p>

            {[
              {
                  label: 'Pipeline de datos propio',
                  desc: 'Scraper de Portal Inmobiliario Vitacura + base de ventas internas + archivos KMZ que asignan barrio a cada propiedad. Todo integrado y actualizado trimestralmente.',
                color: '#8fb2aa',
                delay: '0ms',
                tag: 'Data Pipeline',
              },
              {
                  label: 'Modelos predictivos',
                  desc: 'Regresión entrenada con 5 años de transacciones. El valorizador aprende a ponderar calidad, barrio y atributos específicos de cada inmueble.',
                color: '#b89a7e',
                delay: '120ms',
                tag: 'Predictive AI',
              },
              {
                  label: 'Reportes sin intervención',
                  desc: 'El sistema genera el reporte mensual para el CEO y el semanal para directores automáticamente. Sin Excel, sin armado manual, con los últimos datos disponibles.',
                color: '#10b981',
                delay: '240ms',
                tag: 'Auto Reports',
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
        <div ref={part2.ref} className="max-w-6xl mx-auto px-6">

          {/* Section header */}
          <div
            className="mb-20 transition-all duration-700"
            style={{ opacity: part2.inView ? 1 : 0, transform: part2.inView ? 'translateY(0)' : 'translateY(24px)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8fb2aa' }}>Lo que construimos</p>
            <h2 className="font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#173634', maxWidth: '22ch' }}>
              Tres herramientas para tomar decisiones con datos reales.
            </h2>
          </div>

          {/* Stats row */}
          <div
            ref={stats.ref}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 pb-20 transition-all duration-700"
            style={{
              borderBottom: '1px solid #d8e5e2',
              opacity: stats.inView ? 1 : 0,
              transform: stats.inView ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            {[
              { value: 5, suffix: ' años', label: 'de datos históricos' },
              { value: 88, suffix: '%', label: 'precisión en valuaciones' },
              { value: 12, suffix: 'K+', label: 'propiedades analizadas' },
              { value: 3, suffix: '', label: 'pilares operacionales' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-4xl font-bold mb-1" style={{ color: '#173634' }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm" style={{ color: '#9ca9a3' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 3 Pilares */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pilar 1 */}
            <div
              ref={p1.ref}
              className="group p-8 rounded-2xl transition-all duration-700 cursor-default"
              style={{
                border: '1px solid #d8e5e2',
                background: 'white',
                opacity: p1.inView ? 1 : 0,
                transform: p1.inView ? 'translateY(0)' : 'translateY(32px)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 12px 32px rgba(143,178,170,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6" style={{ background: '#8fb2aa' }}>
                <BarChart3 size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8fb2aa' }}>Pilar 01</div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#173634' }}>Reportes Automáticos</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#555a56' }}>
                Ya tenemos el control de gestión mensual funcionando. El siguiente paso: un reporte semanal para directores que muestre el avance real versus el plan, sin que nadie lo tenga que armar.
              </p>
              <div className="space-y-2.5">
                {['Control mensual para CEO', 'Seguimiento semanal para directores', 'Avance versus plan en tiempo real', 'KPIs de ventas y comisiones'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs" style={{ color: '#555a56' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#8fb2aa' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Pilar 2 */}
            <div
              ref={p2.ref}
              className="group p-8 rounded-2xl transition-all duration-700 cursor-default"
              style={{
                border: '1px solid #d8e5e2',
                background: 'white',
                opacity: p2.inView ? 1 : 0,
                transform: p2.inView ? 'translateY(0)' : 'translateY(32px)',
                transitionDelay: '120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 12px 32px rgba(184,154,126,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6" style={{ background: '#b89a7e' }}>
                <TrendingUp size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#b89a7e' }}>Pilar 02</div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#173634' }}>Market Intelligence</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#555a56' }}>
                Scraper de Portal Inmobiliario Vitacura + base de ventas propias + KMZ con asignación de barrio. Un informe trimestral que muestra qué barrios venden rápido, a qué precio, y cómo han evolucionado en 5 años.
              </p>
              <div className="space-y-2.5">
                {['Velocidad de venta por barrio', 'Precio promedio UF/m²', 'Evolución de precios 5 años', 'Datos actualizados trimestralmente'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs" style={{ color: '#555a56' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#b89a7e' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Pilar 3 */}
            <div
              ref={p3.ref}
              className="group p-8 rounded-2xl transition-all duration-700 cursor-default"
              style={{
                border: '1px solid #d8e5e2',
                background: 'white',
                opacity: p3.inView ? 1 : 0,
                transform: p3.inView ? 'translateY(0)' : 'translateY(32px)',
                transitionDelay: '240ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 12px 32px rgba(16,185,129,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6" style={{ background: '#10b981' }}>
                <DollarSign size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#10b981' }}>Pilar 03</div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#173634' }}>Valorizador Inteligente</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#555a56' }}>
                Un valorizador que no solo usa metros cuadrados y barrio — también pondera la calidad real del inmueble. Terminaciones, estado de conservación y atributos específicos que cambian el precio significativamente.
              </p>
              <div className="space-y-2.5">
                {['Sensibilización por calidad', 'Estado y conservación del inmueble', 'Precio ajustado por barrio', 'Valorización en segundos'].map(item => (
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
            <p className="mt-3 text-sm" style={{ color: '#9ca9a3' }}>Todo el equipo de Property Partners tiene acceso.</p>
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
            <span className="text-xs" style={{ color: '#555a56' }}>Property Partners Platform</span>
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
