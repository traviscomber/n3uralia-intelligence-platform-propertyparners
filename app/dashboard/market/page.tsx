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
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Market Intelligence</h1>
        <p className="text-sm text-gray-600 mt-2">Análisis de precios, absorción e inventario por barrio</p>
      </div>

      {/* Market Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Barrio</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Precio Promedio UF/m²</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Absorción</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Inventario</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{market.neighborhood}</td>
                  <td className="px-6 py-3 text-gray-900">{market.avg_price_m2_uf?.toFixed(1) || 'N/A'} UF/m²</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                      {market.absorption_rate?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-900">{market.inventory_count} props</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Comparison Chart */}
      {!loading && markets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Precio Promedio por Barrio</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={markets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="neighborhood" stroke="#9ca3af" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="avg_price_m2_uf" fill="#5b6ef5" name="UF/m²" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
