import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer'
import {
  buildFallbackValuationAnalysis,
  type ValuationAnalysis,
  type ValuationRequest,
} from '@/lib/valuation-ai'

function formatUF(value: number) {
  return Math.round(value).toLocaleString('es-CL')
}

function formatCLP(value: number) {
  return Math.round(value).toLocaleString('es-CL')
}

function formatDate(value = new Date()) {
  return value.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function iconSvg(color = '#111111') {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="${color}"/>
      <path d="M8 21L8 11H12L16 18L20 11H24V21H21V15.8L17.7 21H14.3L11 15.8V21H8Z" fill="white"/>
    </svg>
  `)}`
}

function priceBandValue(analysis: ValuationAnalysis, label: 'conservador' | 'mercado' | 'aspiracional' | 'piso_negociacion', fallback: number) {
  return analysis.price_bands.find((band) => band.label === label)?.value_uf || fallback
}

function buildNeighborhoodInsights(request: ValuationRequest, analysis: ValuationAnalysis) {
  return [
    {
      label: 'Precio de publicacion',
      value: formatUF(priceBandValue(analysis, 'aspiracional', request.estimated_uf)),
      note: 'Salida aspiracional con margen de negociacion.',
    },
    {
      label: 'Precio de cierre',
      value: formatUF(priceBandValue(analysis, 'mercado', request.estimated_uf)),
      note: 'Punto de cierre objetivo segun mercado.',
    },
    {
      label: 'Piso',
      value: formatUF(priceBandValue(analysis, 'piso_negociacion', request.estimated_uf)),
      note: 'Defensa minima del valor comercial.',
    },
    {
      label: 'Confianza',
      value: `${request.confidence}%`,
      note: 'Sustento del pricing y comparables.',
    },
  ]
}

function buildHtml(request: ValuationRequest, analysis: ValuationAnalysis) {
  const logoPath = join(process.cwd(), 'public', 'n3uralia-logo.webp')
  const logoData = readFileSync(logoPath).toString('base64')
  const logoMime = 'image/webp'
  const insights = buildNeighborhoodInsights(request, analysis)
  const topComparables = request.selected_comparables.slice(0, 4)
  const bars = [
    {
      label: 'Conservador',
      value: priceBandValue(analysis, 'conservador', request.estimated_uf),
      color: 'var(--n3-teal)',
    },
    {
      label: 'Mercado',
      value: priceBandValue(analysis, 'mercado', request.estimated_uf),
      color: '#111111',
    },
    {
      label: 'Aspiracional',
      value: priceBandValue(analysis, 'aspiracional', request.estimated_uf),
      color: '#6f8f89',
    },
  ]
  const maxBar = Math.max(...bars.map((item) => item.value), request.estimated_uf)

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Valorizacion comercial</title>
      <style>
        :root {
          --ink: #111111;
          --muted: #5f6f6c;
          --soft: #eef4f2;
          --line: #e5e7eb;
          --accent: var(--n3-teal);
          --paper: #f7faf9;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: var(--ink);
          background: white;
        }
        .page {
          padding: 28px 30px 32px;
        }
        .hero {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 18px;
          align-items: center;
          padding: 20px;
          border-radius: 20px;
          background: linear-gradient(135deg, #111111 0%, #214d49 100%);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .hero::after {
          content: '';
          position: absolute;
          right: -40px;
          top: -40px;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .brand-mark {
          width: 128px;
          height: 128px;
          border-radius: 24px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(3px);
        }
        .brand-mark img { width: 110px; height: auto; display: block; }
        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.05;
          letter-spacing: -0.02em;
        }
        .subtitle {
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255,255,255,0.88);
          max-width: 680px;
        }
        .meta {
          margin-top: 12px;
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 12px;
          color: rgba(255,255,255,0.76);
        }
        .section {
          margin-top: 16px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: white;
          padding: 16px;
        }
        .section-title {
          margin: 0 0 12px;
          font-size: 15px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .card {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 14px;
          background: var(--paper);
        }
        .card .kicker {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        .card .value {
          margin-top: 8px;
          font-size: 24px;
          font-weight: 700;
        }
        .card .note {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--muted);
        }
        .bar-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }
        .bar-label {
          width: 120px;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .bar-track {
          flex: 1;
          height: 14px;
          background: var(--soft);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--line);
        }
        .bar-fill {
          height: 100%;
          border-radius: 999px;
        }
        .bar-value {
          width: 100px;
          text-align: right;
          font-size: 12px;
          font-weight: 700;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 12px;
        }
        ul {
          margin: 0;
          padding-left: 18px;
        }
        li {
          margin: 0 0 8px;
          font-size: 13px;
          line-height: 1.45;
          color: #243331;
        }
        .comparison-list {
          display: grid;
          gap: 10px;
        }
        .comparable {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fbfcfc;
          padding: 12px;
        }
        .comparable-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .comparable-title {
          font-size: 13px;
          font-weight: 700;
        }
        .comparable-meta {
          font-size: 11px;
          color: var(--muted);
          margin-top: 4px;
        }
        .footer {
          margin-top: 14px;
          font-size: 11px;
          color: var(--muted);
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="hero">
          <div class="brand-mark">
            <img src="data:${logoMime};base64,${logoData}" alt="N3uralia" />
          </div>
          <div>
            <h1>Valorizacion comercial Vitacura</h1>
            <div class="subtitle">
              ${escapeHtml(analysis.summary)}
            </div>
            <div class="meta">
              <span>Barrio: ${escapeHtml(request.neighborhood.name)}</span>
              <span>Condicion: ${escapeHtml(request.condition)}</span>
              <span>Area: ${escapeHtml(String(request.area_m2))} m2</span>
              <span>${formatDate()}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Lectura comercial</h2>
          <div class="grid-4">
            ${insights
              .map(
                (item) => `
              <div class="card">
                <div class="kicker">${escapeHtml(item.label)}</div>
                <div class="value">${escapeHtml(item.value)}</div>
                <div class="note">${escapeHtml(item.note)}</div>
              </div>`,
              )
              .join('')}
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Escenarios de precio</h2>
          ${bars
            .map((item) => {
              const width = Math.max(10, Math.round((item.value / maxBar) * 100))
              return `
              <div class="bar-wrap">
                <div class="bar-label">${escapeHtml(item.label)}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${width}%; background:${item.color};"></div></div>
                <div class="bar-value">${formatUF(item.value)} UF</div>
              </div>`
            })
            .join('')}
        </div>

        <div class="two-col">
          <div class="section">
            <h2 class="section-title">Porque este valor</h2>
            <ul>
              ${(analysis.why_now || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <h2 class="section-title" style="margin-top:16px;">Riesgos</h2>
            <ul>
              ${(analysis.risks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
          <div class="section">
            <h2 class="section-title">Sensibilidad</h2>
            <div class="comparison-list">
              ${(analysis.sensitivities || [])
                .slice(0, 5)
                .map(
                  (item) => `
                <div class="comparable">
                  <div class="comparable-top">
                    <div class="comparable-title">${escapeHtml(item.factor)}</div>
                    <div class="comparable-title">${item.direction === 'down' ? '-' : '+'}${formatUF(item.impact_uf)} UF</div>
                  </div>
                  <div class="comparable-meta">${escapeHtml(item.note)}</div>
                </div>`,
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Comparables principales</h2>
          <div class="comparison-list">
            ${topComparables
              .map(
                (item, index) => `
              <div class="comparable">
                <div class="comparable-top">
                  <div>
                    <div class="comparable-title">${index + 1}. ${escapeHtml(item.address)}</div>
                    <div class="comparable-meta">${escapeHtml(item.neighborhood)} Â· ${item.bedrooms}D/${item.bathrooms}B Â· ${item.area_m2} m2</div>
                  </div>
                  <div class="comparable-title">${formatUF(item.price_uf)} UF</div>
                </div>
                <div class="comparable-meta">Score ${item.score.toFixed(0)}% Â· Similarity ${item.similarity.toFixed(0)}%</div>
              </div>`,
              )
              .join('')}
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Reporte comercial y cierre</h2>
          <div class="grid-3">
            <div class="card">
              <div class="kicker">Vendedor</div>
              <div class="note">Foco en cierre, objeciones, seguimiento y proxima accion.</div>
            </div>
            <div class="card">
              <div class="kicker">Director</div>
              <div class="note">Foco en desempeno del equipo, brechas y cartera priorizada.</div>
            </div>
            <div class="card">
              <div class="kicker">CEO</div>
              <div class="note">Foco en negocio, riesgos, directores y lectura ejecutiva.</div>
            </div>
          </div>
        </div>

        <div class="footer">
          N3uralia Â· N3uralia Vitacura Â· ${analysis.source === 'openai' ? 'Analisis asistido por IA' : 'Analisis deterministico comercial'}
        </div>
      </div>
    </body>
  </html>`
}

export async function buildValuationPdfBuffer(request: ValuationRequest, analysis?: ValuationAnalysis | null) {
  const resolvedAnalysis = analysis || buildFallbackValuationAnalysis(request)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 2200, deviceScaleFactor: 1 })
    await page.setContent(buildHtml(request, resolvedAnalysis), { waitUntil: 'load' })
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '14mm',
        right: '12mm',
        bottom: '14mm',
        left: '12mm',
      },
    })
  } finally {
    await browser.close()
  }
}


