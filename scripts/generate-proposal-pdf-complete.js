const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const blobImages = {
  marketIntel: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-5eAF4sDiw6oJrW7F9CuD8aHHaBFpeM.png',
  controlGestion: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VOKDpgHC7Fkbudm64FH5jWvBdA4Z6P.png',
  dashboard: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-KG5UaGJw03lSBF1uw9y9pctHhTP6Ci.png',
  valorizador: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-GH7PcXPE3gcALWUXqdjoRIPiVnOHsE.png',
  fuentes: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-CBj1ZOA9LliHewfJk8ytztlsF28Kha.png',
  landing: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-YbURVJwZV7FCZz3IAe8ZIhzkkhxnIE.png',
  funnel: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-CuiUzARn4eUtv393Z64TBAtO5GWyqQ.png',
  marketMap: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Smv6uTu8PixtitNvVx2q2KPFVyw3Xf.png',
  threeTools: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-WBQ8EORqFEcctltAGkRTolwwZboudr.png',
  marketDetail: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dWfjWHI6uHUyyOmPMbv4Wz6CXY9nib.png',
  velocity: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-704pCwpZsmKmrAurNakfRs4jmZrLkb.png',
  properties: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Nd2LmJAAfUqOsARE0TJ0kAqh2Tg7Zd.png',
};

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>N3uralia - Propuesta Comercial Profesional</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; line-height: 1.6; color: #333; }
    .page { page-break-after: always; padding: 40px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; background: white; }
    .page-title { font-size: 48px; font-weight: bold; color: #1a5a4a; margin-bottom: 20px; }
    .page-subtitle { font-size: 24px; color: #666; margin-bottom: 30px; }
    .page-content { font-size: 14px; line-height: 1.8; color: #444; }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .kpi { padding: 15px; background: #f5f9f7; border: 1px solid #d8e5e2; border-radius: 8px; }
    .kpi-value { font-size: 32px; font-weight: bold; color: #1a5a4a; }
    .kpi-label { font-size: 12px; color: #666; margin-top: 5px; }
    img { max-width: 100%; height: auto; margin: 20px 0; }
    .cover { background: linear-gradient(135deg, #1a5a4a 0%, #2d8b7f 100%); color: white; text-align: center; }
    .cover h1 { font-size: 72px; margin-bottom: 20px; }
    .cover p { font-size: 24px; margin-bottom: 40px; }
    h2 { color: #1a5a4a; font-size: 32px; margin-bottom: 15px; margin-top: 0; }
    h3 { color: #2d8b7f; font-size: 18px; margin-top: 15px; margin-bottom: 10px; }
    ul { margin-left: 20px; margin-top: 10px; }
    li { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #1a5a4a; color: white; padding: 10px; text-align: left; }
    td { border-bottom: 1px solid #ddd; padding: 10px; }
    .tech-stack { background: #f5f9f7; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page cover">
  <h1>Property Partners</h1>
  <h2 style="color: white; font-size: 32px;">Inteligencia de Mercado Inmobiliario</h2>
  <p>Decisiones inmobiliarias respaldadas por datos reales</p>
  <p style="font-size: 16px; margin-top: 60px; opacity: 0.9;">Vitacura, Santiago • Julio 2026</p>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="page">
  <h2>Propuesta de Valor</h2>
  <p style="margin-bottom: 20px;">N3uralia Intelligence Platform automatiza análisis de mercado inmobiliario, proporcionando inteligencia en tiempo real para directores, ejecutivos de ventas y asesores de propiedades.</p>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-value">75+</div>
      <div class="kpi-label">Propiedades actualizadas diariamente</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">11</div>
      <div class="kpi-label">Barrios de Vitacura en tiempo real</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">6</div>
      <div class="kpi-label">Fuentes de datos integradas</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">100%</div>
      <div class="kpi-label">Cobertura geoespacial</div>
    </div>
  </div>
  <h3>Tres Herramientas Principales:</h3>
  <ul>
    <li><strong>Market Intelligence:</strong> KPIs por barrio, análisis de velocidad, absorción e inventario</li>
    <li><strong>Valorizador IA:</strong> Estimación de precios basada en factores reales del mercado</li>
    <li><strong>Reportes Automáticos:</strong> Análisis semanal sin intervención manual</li>
  </ul>
</div>

<!-- PAGE 3: EXECUTIVE DASHBOARD -->
<div class="page">
  <h2>Executive Dashboard</h2>
  <p>Métricas en tiempo real para directores y ejecutivos</p>
  <img src="\${blobImages.dashboard}" alt="Executive Dashboard" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: KPIs en tiempo real - 28 ventas mes, 42.5K UF volumen, 9% conversión</p>
</div>

<!-- PAGE 4: MARKET INTELLIGENCE MAP -->
<div class="page">
  <h2>Market Intelligence - Mapa GIS</h2>
  <p>Visualización de 11 barrios de Vitacura con datos en tiempo real</p>
  <img src="\${blobImages.marketMap}" alt="Market Intelligence Map" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Mapa interactivo con polígonos coloreados por zona y KPIs asociados</p>
</div>

<!-- PAGE 5: MARKET INTELLIGENCE DETAILED -->
<div class="page">
  <h2>Análisis por Barrio</h2>
  <p>Benchmarks detallados de cada sector</p>
  <img src="\${blobImages.marketDetail}" alt="Market Detail" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Tabla de benchmarks - Precio UF/m², Velocidad días, Absorción %</p>
</div>

<!-- PAGE 6: VELOCITY & ABSORPTION -->
<div class="page">
  <h2>Análisis de Velocidad y Absorción</h2>
  <p>Indicadores de dinámica de mercado por barrio</p>
  <img src="\${blobImages.velocity}" alt="Velocity Analysis" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Gráfico de velocidad en días vs absorción por barrio</p>
</div>

<!-- PAGE 7: PRICE ANALYSIS -->
<div class="page">
  <h2>Análisis de Precios</h2>
  <p>Precios promedio por metro cuadrado en UF</p>
  <img src="\${blobImages.marketIntel}" alt="Price Analysis" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Comparativa de precios UF/m² con mapa GIS</p>
</div>

<!-- PAGE 8: CONTROL DE GESTIÓN -->
<div class="page">
  <h2>Control de Gestión - Performance por Director</h2>
  <p>Monitoreo de objetivos y resultados</p>
  <img src="\${blobImages.controlGestion}" alt="Control de Gestión" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: KPIs de directores (ventas, conversión, cumplimiento vs target)</p>
</div>

<!-- PAGE 9: VALORIZADOR IA -->
<div class="page">
  <h2>Valorizador Inteligente</h2>
  <p>Estimación de precios basada en múltiples factores</p>
  <img src="\${blobImages.valorizador}" alt="Valorizador" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Herramienta de valuación con comparables por barrio</p>
</div>

<!-- PAGE 10: PROPERTIES LOADER -->
<div class="page">
  <h2>Property Loader - Propiedades en Tiempo Real</h2>
  <p>Base de datos de 75+ propiedades actualizadas automáticamente</p>
  <img src="\${blobImages.properties}" alt="Properties" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Tabla de propiedades de Portal Inmobiliario y TOCTOC</p>
</div>

<!-- PAGE 11: DATA SOURCES -->
<div class="page">
  <h2>Fuentes de Datos Integradas</h2>
  <p>Pipeline de inteligencia con 6 fuentes activas</p>
  <img src="\${blobImages.fuentes}" alt="Data Sources" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Pipeline de datos activo - 18.018 registros totales</p>
</div>

<!-- PAGE 12: FUNNEL ANALYTICS -->
<div class="page">
  <h2>Analytics de Conversión</h2>
  <p>Embudo de ventas y análisis de tendencias</p>
  <img src="\${blobImages.funnel}" alt="Funnel Analysis" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Ventas vs objetivo, conversión tendencia, embudo de ventas</p>
</div>

<!-- PAGE 13: THREE TOOLS -->
<div class="page">
  <h2>Tres Herramientas para Decisiones</h2>
  <p>La plataforma se fundamenta en tres pilares de inteligencia</p>
  <img src="\${blobImages.threeTools}" alt="Three Tools" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Pilares - Reportes automáticos, Market Intelligence, Valorizador</p>
</div>

<!-- PAGE 14: LANDING PAGE -->
<div class="page">
  <h2>Interfaz Pública</h2>
  <p>Acceso a la plataforma para directores y ejecutivos</p>
  <img src="\${blobImages.landing}" alt="Landing Page" style="width: 100%; height: auto; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; margin-top: 10px;">Figura: Página de acceso con propuesta de valor</p>
</div>

<!-- PAGE 15: ARCHITECTURE -->
<div class="page">
  <h2>Arquitectura Técnica</h2>
  <h3>Base de Datos</h3>
  <p>Supabase PostgreSQL con PostGIS para datos geoespaciales</p>
  <ul>
    <li>neighborhoods (11 barrios con geometría)</li>
    <li>properties (75+ propiedades con lat/lng)</li>
    <li>market_data (KPIs por barrio)</li>
    <li>kpi_snapshots (históricos para tendencias)</li>
    <li>ai_reports (reportes automatizados)</li>
    <li>profiles (usuarios con roles)</li>
  </ul>
  <h3>RPC Functions (PostGIS)</h3>
  <ul>
    <li>tag_vitacura_point(lat, lng) - Auto-asigna barrio</li>
    <li>get_neighborhoods_geojson() - Retorna barrios</li>
    <li>get_prc_zones_geojson() - Retorna zonas PRC</li>
    <li>upsert_prc_zone() - Sincroniza ArcGIS</li>
    <li>enrich_neighborhoods_zona_prc() - Actualiza geometría</li>
  </ul>
</div>

<!-- PAGE 16: API & SCRAPER -->
<div class="page">
  <h2>API Routes & Web Scraper</h2>
  <h3>API Endpoints</h3>
  <ul>
    <li>/api/neighborhoods - GET/POST barrios</li>
    <li>/api/neighborhoods/geojson - GET como GeoJSON</li>
    <li>/api/properties - CRUD de propiedades</li>
    <li>/api/market-data - Datos de mercado</li>
    <li>/api/reports - Reportes IA</li>
    <li>/api/prc/sync - Sincronización ArcGIS</li>
    <li>/api/scrape/portal-inmobiliario - Puppeteer scraper</li>
    <li>/api/db/init - Health check</li>
  </ul>
  <h3>Web Scraper</h3>
  <p><strong>Puppeteer + Cheerio:</strong> Extrae 75+ propiedades de Portal Inmobiliario. Parsing inteligente de precios UF chilenos, rangos de atributos, geo-tagging automático. Rate limiting 300ms con validación de datos.</p>
</div>

<!-- PAGE 17: ROADMAP & NEXT STEPS -->
<div class="page">
  <h2>Roadmap de Desarrollo</h2>
  <h3>Completadas (v0.5.0)</h3>
  <ul>
    <li>Phase 0-3: Landing, BD, datos reales, scraper Portal</li>
  </ul>
  <h3>Próximas Fases</h3>
  <ul>
    <li>Phase 4: Reportes IA con OpenAI GPT-4o</li>
    <li>Phase 5: Scraper multi-fuente (TOCTOC, iCasas, Yapo)</li>
    <li>Phase 6: Geocodificación Google Maps API</li>
    <li>Phase 7: Email digest semanal con Resend</li>
    <li>Phase 8: App móvil React Native</li>
    <li>Phase 9: v1.0 Production</li>
  </ul>
  <h3>Próximos Pasos</h3>
  <p><strong>Semana 1:</strong> Demostración en vivo de plataforma (30 min)</p>
  <p><strong>Semana 2:</strong> Validación de datos con equipo comercial</p>
  <p><strong>Semana 3:</strong> Pilot program: 10 propiedades reales</p>
  <p><strong>Mes 1:</strong> Integración con CRM existente</p>
  <p><strong>Mes 2:</strong> Launch v1.0 producción</p>
  <p style="margin-top: 30px; font-size: 16px; color: #1a5a4a; font-weight: bold;">Contacto: juan@n3uralia.com</p>
</div>

</body>
</html>
`;

async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: path.join(__dirname, '../public/propuesta-profesional-completa.pdf'),
      format: 'A4',
      margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
      printBackground: true,
      scale: 1
    });
    
    console.log('PDF generado exitosamente: public/propuesta-profesional-completa.pdf');
  } catch (error) {
    console.error('Error generando PDF:', error);
  } finally {
    await browser.close();
  }
}

generatePDF();
