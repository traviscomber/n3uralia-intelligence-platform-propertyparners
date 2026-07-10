'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface MarketData {
  neighborhood: string
  avg_price_uf: number
  avg_price_m2_uf: number
  absorption_rate: number
  inventory_count: number
}

export default function MarketPage() {
  const [markets, setMarkets] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('market_data')
          .select('neighborhood, avg_price_uf, avg_price_m2_uf, absorption_rate, inventory_count')
          .order('absorption_rate', { ascending: false })
          .limit(10)

        setMarkets(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Market Intelligence
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Análisis de precios, absorción e inventario por barrio
        </p>
      </div>

      {/* Market Table */}
      <div className="n-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--n-border)', background: 'var(--n-surface-2)' }}>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--n-fg)' }}>
                  Barrio
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--n-fg)' }}>
                  Precio Promedio UF/m²
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--n-fg)' }}>
                  Absorción
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: 'var(--n-fg)' }}>
                  Inventario
                </th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--n-border)' }}>
                  <td className="px-6 py-3" style={{ color: 'var(--n-fg)' }}>
                    {market.neighborhood}
                  </td>
                  <td className="px-6 py-3" style={{ color: 'var(--n-fg)' }}>
                    {market.avg_price_m2_uf?.toFixed(1) || 'N/A'} UF/m²
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        background: 'var(--n-success-muted)',
                        color: 'var(--n-success)',
                      }}
                    >
                      {market.absorption_rate?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-3" style={{ color: 'var(--n-fg)' }}>
                    {market.inventory_count} props
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Comparison Chart */}
      {!loading && markets.length > 0 && (
        <div className="n-card p-6">
          <h2 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-4">
            Precio Promedio por Barrio
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={markets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--n-border)" />
              <XAxis dataKey="neighborhood" stroke="var(--n-fg-muted)" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="var(--n-fg-muted)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)' }}
                labelStyle={{ color: 'var(--n-fg)' }}
              />
              <Bar dataKey="avg_price_m2_uf" fill="var(--n-primary)" name="UF/m²" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
