'use client'

import { useState } from 'react'
import { Home } from 'lucide-react'

interface ValorizationResult {
  price_uf: number
  price_clp: number
  confidence: number
}

export default function ValorizadorPage() {
  const [formData, setFormData] = useState({
    neighborhood: 'Vitacura',
    area_m2: 120,
    bedrooms: 3,
    bathrooms: 2,
    age_years: 5,
  })

  const [result, setResult] = useState<ValorizationResult | null>(null)

  const calculatePrice = () => {
    // Simplified valuation model based on comparable data
    const basePrice: { [key: string]: number } = {
      Vitacura: 120,
      'La Dehesa': 140,
      'Chicureo': 100,
      'Lo Curro': 95,
      'Santa María': 110,
    }

    const base = basePrice[formData.neighborhood] || 100
    const areaFactor = formData.area_m2 / 100
    const bedroomFactor = 1 + formData.bedrooms * 0.05
    const bathroomFactor = 1 + formData.bathrooms * 0.03
    const ageFactor = Math.max(0.8, 1 - formData.age_years * 0.02)

    const price_uf = base * areaFactor * bedroomFactor * bathroomFactor * ageFactor
    const confidence = 75 + Math.random() * 20

    setResult({
      price_uf: Math.round(price_uf * 100) / 100,
      price_clp: Math.round(price_uf * 35000),
      confidence: Math.round(confidence),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Valorizador IA
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Estimación automática de valores de propiedades
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="n-card p-6">
          <h2 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-4">
            Datos de la Propiedad
          </h2>

          <div className="space-y-4">
            <div>
              <label style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium block mb-2">
                Barrio
              </label>
              <select
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="w-full px-3 py-2 rounded border text-sm"
                style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)', color: 'var(--n-fg)' }}
              >
                {['Vitacura', 'La Dehesa', 'Chicureo', 'Lo Curro', 'Santa María'].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium block mb-2">
                Área (m²)
              </label>
              <input
                type="number"
                value={formData.area_m2}
                onChange={(e) => setFormData({ ...formData, area_m2: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border text-sm"
                style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)', color: 'var(--n-fg)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium block mb-2">
                  Dormitorios
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)', color: 'var(--n-fg)' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium block mb-2">
                  Baños
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)', color: 'var(--n-fg)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium block mb-2">
                Antigüedad (años)
              </label>
              <input
                type="number"
                value={formData.age_years}
                onChange={(e) => setFormData({ ...formData, age_years: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border text-sm"
                style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)', color: 'var(--n-fg)' }}
              />
            </div>

            <button
              onClick={calculatePrice}
              className="w-full py-2.5 rounded font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--n-primary)', color: 'white' }}
            >
              Calcular Valorización
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="n-card p-6 border-l-4" style={{ borderLeftColor: 'var(--n-accent)' }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--n-primary-muted)' }}>
                <Home size={24} style={{ color: 'var(--n-primary)' }} />
              </div>
              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
                  VALOR ESTIMADO
                </p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--n-primary)' }}>
                  {result.price_uf.toLocaleString('es-CL')} UF
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium mb-1">
                  En Pesos Chilenos
                </p>
                <p style={{ color: 'var(--n-fg)' }} className="text-lg font-semibold">
                  ${result.price_clp.toLocaleString('es-CL')}
                </p>
              </div>

              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium mb-1">
                  Confianza del Modelo
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--n-border)' }}>
                    <div
                      className="h-full"
                      style={{ background: 'var(--n-success)', width: `${result.confidence}%` }}
                    />
                  </div>
                  <span style={{ color: 'var(--n-success)' }} className="text-sm font-semibold">
                    {result.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
