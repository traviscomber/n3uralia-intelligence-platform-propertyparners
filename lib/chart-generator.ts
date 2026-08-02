// Inline SVG chart generation with Base64 encoding
// Charts embedded directly in email - no external dependencies or APIs

export async function generateComplianceChart(months: string[], values: number[]): Promise<string> {
  const W = 800, H = 420, PADDING = 60, BAR_W = 50, GAP = 8
  const chartW = W - PADDING * 2
  const chartH = H - PADDING * 2
  const barSpacing = chartW / months.length
  
  // Grid lines
  const gridLines = []
  for (let i = 0; i <= 100; i += 25) {
    const y = PADDING + chartH - ((i / 120) * chartH)
    gridLines.push(`<line x1="${PADDING}" y1="${y}" x2="${W - PADDING}" y2="${y}" stroke="#EEEEEE" stroke-width="1"/>`)
    gridLines.push(`<text x="${PADDING - 8}" y="${y + 5}" text-anchor="end" font-size="13" font-weight="500" fill="#666">${i}%</text>`)
  }
  
  const bars = months.map((m, i) => {
    const v = values[i]
    const color = v >= 90 ? '#27AE60' : v >= 70 ? '#F39C12' : '#E74C3C'
    const barH = (v / 120) * chartH
    const x = PADDING + (i * barSpacing) + (barSpacing - BAR_W) / 2
    const y = PADDING + chartH - barH
    return `
      <rect x="${x}" y="${y}" width="${BAR_W}" height="${barH}" fill="${color}" rx="4" opacity="0.92"/>
      <text x="${x + BAR_W/2}" y="${y - 10}" text-anchor="middle" font-size="14" font-weight="700" fill="#333">${v}%</text>
      <text x="${x + BAR_W/2}" y="${H - 16}" text-anchor="middle" font-size="12" font-weight="600" fill="#555">${m}</text>`
  }).join('')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FFFFFF" rx="8"/>
  ${gridLines.join('')}
  <line x1="${PADDING}" y1="${PADDING + chartH}" x2="${W - PADDING}" y2="${PADDING + chartH}" stroke="#333" stroke-width="2"/>
  <line x1="${PADDING}" y1="${PADDING}" x2="${PADDING}" y2="${PADDING + chartH}" stroke="#333" stroke-width="2"/>
  <text x="${W/2}" y="${28}" text-anchor="middle" font-size="16" font-weight="700" fill="#333">Cumplimiento % Mensual</text>
  <text x="${W/2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#999">Meta: 100%</text>
  ${bars}
</svg>`

  const encoded = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${encoded}`
}

export async function generateClosuresChart(months: string[], values: number[]): Promise<string> {
  const W = 800, H = 420, PADDING = 60
  const chartW = W - PADDING * 2
  const chartH = H - PADDING * 2
  const maxVal = Math.max(...values, 10)
  const pointSpacing = months.length > 1 ? chartW / (months.length - 1) : chartW / 2
  
  // Grid lines
  const gridLines = []
  const gridStep = Math.ceil(maxVal / 5)
  for (let i = 0; i <= maxVal; i += gridStep) {
    const y = PADDING + chartH - ((i / maxVal) * chartH)
    gridLines.push(`<line x1="${PADDING}" y1="${y}" x2="${W - PADDING}" y2="${y}" stroke="#EEEEEE" stroke-width="1"/>`)
    gridLines.push(`<text x="${PADDING - 8}" y="${y + 5}" text-anchor="end" font-size="13" font-weight="500" fill="#666">${i}</text>`)
  }
  
  // Build line path
  const points = months.map((m, i) => {
    const x = PADDING + (i * pointSpacing)
    const y = PADDING + chartH - ((values[i] / maxVal) * chartH)
    return `${x},${y}`
  }).join(' ')

  // Area fill (polygon)
  const polyPoints = `${PADDING},${PADDING + chartH} ${months.map((m, i) => {
    const x = PADDING + (i * pointSpacing)
    const y = PADDING + chartH - ((values[i] / maxVal) * chartH)
    return `${x},${y}`
  }).join(' ')} ${W - PADDING},${PADDING + chartH}`

  const circles = months.map((m, i) => {
    const x = PADDING + (i * pointSpacing)
    const y = PADDING + chartH - ((values[i] / maxVal) * chartH)
    return `<circle cx="${x}" cy="${y}" r="6" fill="#1976D2" stroke="#FFF" stroke-width="3"/>
      <text x="${x}" y="${y - 16}" text-anchor="middle" font-size="14" font-weight="700" fill="#1976D2">${values[i]}</text>
      <text x="${x}" y="${H - 16}" text-anchor="middle" font-size="12" font-weight="600" fill="#555">${m}</text>`
  }).join('')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FFFFFF" rx="8"/>
  ${gridLines.join('')}
  <polygon points="${polyPoints}" fill="rgba(25, 118, 210, 0.1)" stroke="none"/>
  <polyline points="${points}" fill="none" stroke="#1976D2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${PADDING}" y1="${PADDING + chartH}" x2="${W - PADDING}" y2="${PADDING + chartH}" stroke="#333" stroke-width="2"/>
  <line x1="${PADDING}" y1="${PADDING}" x2="${PADDING}" y2="${PADDING + chartH}" stroke="#333" stroke-width="2"/>
  <text x="${W/2}" y="${28}" text-anchor="middle" font-size="16" font-weight="700" fill="#333">Cierres por Mes</text>
  <text x="${W/2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#999">Tendencia 6 meses (Enero-Junio)</text>
  ${circles}
</svg>`

  const encoded = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${encoded}`
}
