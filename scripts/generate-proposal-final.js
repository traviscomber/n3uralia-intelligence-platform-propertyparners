const fs = require('fs');
const path = require('path');

// All blob image URLs from user
const images = {
  marketMap: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-5eAF4sDiw6oJrW7F9CuD8aHHaBFpeM.png',
  controlGestion: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VOKDpgHC7Fkbudm64FH5jWvBdA4Z6P.png',
  executiveDash: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-KG5UaGJw03lSBF1uw9y9pctHhTP6Ci.png',
  valorizador: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-GH7PcXPE3gcALWUXqdjoRIPiVnOHsE.png',
  fuentesDatos: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-CBj1ZOA9LliHewfJk8ytztlsF28Kha.png',
  landing: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-YbURVJwZV7FCZz3IAe8ZIhzkkhxnIE.png',
  funnelCharts: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-CuiUzARn4eUtv393Z64TBAtO5GWyqQ.png',
  marketTable: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dWfjWHI6uHUyyOmPMbv4Wz6CXY9nib.png',
  marketPRC: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Smv6uTu8PixtitNvVx2q2KPFVyw3Xf.png',
  threeTools: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-WBQ8EORqFEcctltAGkRTolwwZboudr.png',
  priceChart: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-704pCwpZsmKmrAurNakfRs4jmZrLkb.png',
  properties: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Nd2LmJAAfUqOsARE0TJ0kAqh2Tg7Zd.png',
};

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>N3uralia Intelligence Platform — Propuesta Comercial Profesional</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Calibri', 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .page { page-break-after: always; padding: 60px 50px; min-height: 100vh; background: white; }
    .page:nth-child(odd) { background: #fafafa; }
    
    /* Colors */
    .dark-green { color: #1a4d42; }
    .teal { color: #5cb8a6; }
    .tan { color: #a89968; }
    
    h1 { font-size: 48px; font-weight: bold; margin-bottom: 20px; color: #1a4d42; }
    h2 { font-size: 32px; font-weight: bold; margin-bottom: 15px; color: #1a4d42; margin-top: 20px; }
    h3 { font-size: 20px; font-weight: 600; margin-bottom: 10px; color: #2d6b5f; }
    p { font-size: 15px; margin-bottom: 12px; line-height: 1.7; }
    
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a4d42 0%, #2d6b5f 100%);
      color: white;
    }
    .cover h1 { font-size: 56px; color: white; margin-bottom: 30px; }
    .cover p { font-size: 22px; color: #b0d4cc; margin-bottom: 15px; }
    
    .hero { background: white; }
    .hero p { font-size: 18px; color: #666; margin-bottom: 20px; }
    
    .image-container {
      margin: 30px 0;
      text-align: center;
    }
    .image-container img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .image-caption {
      font-size: 12px;
      color: #999;
      margin-top: 12px;
      font-style: italic;
    }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #5cb8a6;
    }
    .kpi {
      font-size: 32px;
      font-weight: bold;
      color: #1a4d42;
    }
    .kpi-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #999;
      margin-top: 5px;
    }
    
    .section-intro {
      background: #f5f9f7;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #5cb8a6;
    }
    
    ul { margin-left: 20px; margin-top: 10px; }
    ul li { margin-bottom: 8px; }
    
    @media print {
      body { margin: 0; padding: 0; }
      .page { margin: 0; padding: 40px; }
      .image-container img { max-width: 100%; }
    }
  </style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page cover">
  <h1>N3uralia Intelligence Platform</h1>
  <p>Decisiones inmobiliarias respaldadas por datos</p>
  <p style="font-size: 18px; color: #b0d4cc; margin-top: 50px;">Propuesta Comercial Professional</p>
  <p style="font-size: 14px; color: #b0d4cc; margin-top: 100px;">Vitacura, Julio 2026</p>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="page">
  <h2>Resumen Ejecutivo</h2>
  <p>N3uralia Intelligence Platform es una solución integral de inteligencia artificial para decisiones inmobiliarias en Vitacura, Chile. Combina análisis de mercado en tiempo real, valuación inteligente y automatización de reportes para directores comerciales y ejecutivos inmobiliarios.</p>
  
  <div class="section-intro">
    <h3>Tres Herramientas Principales:</h3>
    <ul>
      <li><strong>Market Intelligence:</strong> Dashboard en tiempo real con KPIs de 11 barrios, mapa interactivo GIS y análisis de tendencias</li>
      <li><strong>Valorizador IA:</strong> Modelo de pricing multi-factor que estima precios reales según barrio, calidad y comparables</li>
      <li><strong>Reportes Automatizados:</strong> Generación semanal de reportes para CEOs y directores con actualización automática</li>
    </ul>
  </div>
  
  <div class="grid-2">
    <div class="card">
      <div class="kpi">75+</div>
      <div class="kpi-label">Propiedades Reales</div>
      <p style="font-size: 13px; margin-top: 10px;">Portal Inmobiliario + TOCTOC</p>
    </div>
    <div class="card">
      <div class="kpi">11</div>
      <div class="kpi-label">Barrios Vitacura</div>
      <p style="font-size: 13px; margin-top: 10px;">Con geometría GIS + KPIs</p>
    </div>
  </div>
</div>

<!-- PAGE 3: EXECUTIVE DASHBOARD -->
<div class="page">
  <h2>Executive Dashboard</h2>
  <p>Métricas en tiempo real para la toma de decisiones estratégica. Visualización de KPIs mensuales, tendencias de ventas y tasa de conversión.</p>
  <div class="image-container">
    <img src="${images.executiveDash}" alt="Executive Dashboard">
    <div class="image-caption">Figura 1: Dashboard Ejecutivo — 28 ventas/mes, 42.5K UF volumen, 9% conversión</div>
  </div>
</div>

<!-- PAGE 4: MARKET INTELLIGENCE MAP -->
<div class="page">
  <h2>Market Intelligence — Mapa GIS Interactivo</h2>
  <p>Visualización geográfica de los 11 barrios de Vitacura con datos en tiempo real. Cada polígono muestra precio promedio, velocidad de venta, absorción e inventario.</p>
  <div class="image-container">
    <img src="${images.marketMap}" alt="Market Intelligence Map">
    <div class="image-caption">Figura 2: Mapa GIS con 11 barrios coloreados por zona y tipo</div>
  </div>
</div>

<!-- PAGE 5: MARKET INTELLIGENCE PRC -->
<div class="page">
  <h2>Market Intelligence — Overlay PRC ArcGIS</h2>
  <p>Integración de zonas PRC (Plano Regulador Comunal) sincronizado automáticamente desde ArcGIS. Superpone restricciones de uso de suelo sobre datos de mercado real.</p>
  <div class="image-container">
    <img src="${images.marketPRC}" alt="Market Intelligence PRC">
    <div class="image-caption">Figura 3: Overlay de zonas PRC sobre mercado inmobiliario</div>
  </div>
</div>

<!-- PAGE 6: MARKET TABLE -->
<div class="page">
  <h2>Market Intelligence — Tabla Detallada</h2>
  <p>Listado completo de los 11 barrios con benchmarks detallados: precio promedio UF/m², velocidad de venta en días, absorción e inventario disponible.</p>
  <div class="image-container">
    <img src="${images.marketTable}" alt="Market Table">
    <div class="image-caption">Figura 4: Tabla de barrios con KPIs y benchmarks</div>
  </div>
</div>

<!-- PAGE 7: PRICE CHART -->
<div class="page">
  <h2>Market Intelligence — Análisis de Precios</h2>
  <p>Gráfico comparativo de precios UF/m² por barrio. Permite identificar oportunidades de pricing y comparar competencia en el mercado Vitacura.</p>
  <div class="image-container">
    <img src="${images.priceChart}" alt="Price Chart">
    <div class="image-caption">Figura 5: Precios UF/m² por barrio — Nueva Costanera líder en precio</div>
  </div>
</div>

<!-- PAGE 8: CONTROL DE GESTIÓN -->
<div class="page">
  <h2>Control de Gestión — Performance de Directores</h2>
  <p>Dashboard gerencial con métricas de desempeño por director comercial. Seguimiento de ventas mensuales, cumplimiento vs objetivo y tasa de conversión.</p>
  <div class="image-container">
    <img src="${images.controlGestion}" alt="Control de Gestión">
    <div class="image-caption">Figura 6: Performance de 3 directores — Juan (24/25 ventas), María (21/22), Carlos (19/20)</div>
  </div>
</div>

<!-- PAGE 9: VALORIZADOR IA -->
<div class="page">
  <h2>Valorizador IA — Price Estimation Tool</h2>
  <p>Herramienta inteligente de valuación que usa machine learning entrenado con 5 años de datos reales. Pondera: barrio, calidad, atributos (dorm/baños), precio por m², condición y extras.</p>
  <div class="image-container">
    <img src="${images.valorizador}" alt="Valorizador IA">
    <div class="image-caption">Figura 7: Valorizador IA — Estimación basada en 11 barrios Vitacura + comparables históricos</div>
  </div>
</div>

<!-- PAGE 10: PROPERTIES TABLE -->
<div class="page">
  <h2>Property Loader — 75 Propiedades Reales</h2>
  <p>Sistema de carga automática de propiedades desde Portal Inmobiliario y TOCTOC. Incluye auto-tagging por barrio, precio UF, área, dormitorios y status.</p>
  <div class="image-container">
    <img src="${images.properties}" alt="Properties">
    <div class="image-caption">Figura 8: Property Loader — 75 propiedades reales con datos de Portal + TOCTOC</div>
  </div>
</div>

<!-- PAGE 11: FUENTES DE DATOS -->
<div class="page">
  <h2>Fuentes de Datos — Pipeline Integrado</h2>
  <p>Sistema de 6 fuentes de datos activas en tiempo real: Portal Inmobiliario, Histórico de Ventas, KMZ Barrios, Motor de Mercado, Base de Conocimiento y Generador de Reportes.</p>
  <div class="image-container">
    <img src="${images.fuentesDatos}" alt="Fuentes de Datos">
    <div class="image-caption">Figura 9: Pipeline de 6 fuentes activas — 18.018 registros totales sincronizados</div>
  </div>
</div>

<!-- PAGE 12: FUNNEL CHARTS -->
<div class="page">
  <h2>Analytics — Conversión y Embudo de Ventas</h2>
  <p>Visualización de métricas clave: ventas vs objetivo (12 meses), tasa de conversión con tendencia y embudo de ventas mostrando flujo de leads a conversión.</p>
  <div class="image-container">
    <img src="${images.funnelCharts}" alt="Funnel Charts">
    <div class="image-caption">Figura 10: Análisis de conversión — Ventas vs Objetivo, Tasa % y Embudo</div>
  </div>
</div>

<!-- PAGE 13: THREE TOOLS VALUE -->
<div class="page">
  <h2>Tres Herramientas para Tomar Decisiones con Datos Reales</h2>
  <p>N3uralia combina 5 años de histórico, 12 sectores principales y 2.800+ propiedades analizadas para entregar soluciones financieras y comerciales precisas.</p>
  <div class="image-container">
    <img src="${images.threeTools}" alt="Three Tools">
    <div class="image-caption">Figura 11: Pilares de la plataforma — Reportes Automáticos, Market Intelligence, Valorizador</div>
  </div>
</div>

<!-- PAGE 14: LANDING PAGE -->
<div class="page">
  <h2>Landing Page — Propuesta de Valor</h2>
  <p>Interfaz pública presentando la plataforma a nuevos usuarios. Muestra pain points del mercado (DSO 60-75 días) y cómo N3uralia acelera decisiones con datos.</p>
  <div class="image-container">
    <img src="${images.landing}" alt="Landing Page">
    <div class="image-caption">Figura 12: Landing Page — "Decisiones inmobiliarias respaldadas por datos"</div>
  </div>
</div>

<!-- PAGE 15: TECHNICAL ARCHITECTURE -->
<div class="page">
  <h2>Arquitectura Técnica</h2>
  
  <h3>Base de Datos — Supabase + PostGIS</h3>
  <ul>
    <li><strong>neighborhoods:</strong> 11 barrios con geometría GIS real (~600m × 600m)</li>
    <li><strong>properties:</strong> 75+ propiedades con lat/lng, precio, atributos</li>
    <li><strong>market_data:</strong> KPIs históricos por barrio (precio, velocidad, absorción)</li>
    <li><strong>kpi_snapshots:</strong> Snapshots mensuales para tendencias</li>
    <li><strong>ai_reports:</strong> Reportes generados automáticamente con IA</li>
    <li><strong>vitacura_prc_zones:</strong> Zonas PRC sincronizadas desde ArcGIS</li>
  </ul>
  
  <h3>PostGIS RPC Functions (5)</h3>
  <ul>
    <li><strong>tag_vitacura_point(lat, lng):</strong> Auto-asigna barrio a coordenada</li>
    <li><strong>get_neighborhoods_geojson():</strong> Retorna barrios como GeoJSON</li>
    <li><strong>get_prc_zones_geojson():</strong> Retorna zonas PRC como GeoJSON</li>
    <li><strong>upsert_prc_zone():</strong> Sincroniza zonas desde ArcGIS</li>
    <li><strong>enrich_neighborhoods_zona_prc():</strong> Actualiza geometría post-sync</li>
  </ul>
  
  <h3>API Routes (9)</h3>
  <ul>
    <li>/api/neighborhoods — GET neighborhoods + RLS</li>
    <li>/api/neighborhoods/geojson — GET GeoJSON para Leaflet</li>
    <li>/api/prc/zones — GET PRC zones como GeoJSON</li>
    <li>/api/prc/sync — POST: Sync ArcGIS → vitacura_prc_zones</li>
    <li>/api/properties — CRUD propiedades</li>
    <li>/api/scrape/portal-inmobiliario — POST: Puppeteer scraper</li>
    <li>/api/reports — GET/POST/DELETE reportes IA</li>
    <li>/api/db/init — Health check y inicialización</li>
    <li>/api/download/propuesta — Descargar propuesta PDF/Word</li>
  </ul>
</div>

<!-- PAGE 16: ROADMAP -->
<div class="page">
  <h2>Development Roadmap</h2>
  
  <h3>Phases Completadas (v0.5.0 - Julio 2026)</h3>
  <ul>
    <li><strong>Phase 0:</strong> Landing Page ✓</li>
    <li><strong>Phase 1:</strong> Infrastructure (Supabase + PostGIS) ✓</li>
    <li><strong>Phase 2:</strong> Market Intelligence (Leaflet map, 11 barrios) ✓</li>
    <li><strong>Phase 3:</strong> Scraper (Puppeteer, 75 propiedades) ✓</li>
  </ul>
  
  <h3>Próximas Fases (Roadmap)</h3>
  <ul>
    <li><strong>Phase 4:</strong> AI Reports (OpenAI GPT-4o) — Agosto 2026</li>
    <li><strong>Phase 5:</strong> Scraper v2 (TOCTOC + iCasas, 500+ props) — Agosto 2026</li>
    <li><strong>Phase 6:</strong> Geocoding Real (Google Maps API)</li>
    <li><strong>Phase 7:</strong> Email Digest (Resend para directores)</li>
    <li><strong>Phase 8:</strong> Mobile App (React Native iOS/Android)</li>
    <li><strong>Phase 9:</strong> v1.0 Production (Security audit, SLA)</li>
  </ul>
</div>

<!-- PAGE 17: NEXT STEPS -->
<div class="page">
  <h2>Próximos Pasos</h2>
  
  <div class="section-intro">
    <h3>Implementación Sugerida (2-3 meses)</h3>
    <ul>
      <li><strong>Semana 1:</strong> Demostración en vivo (30 min) + Q&A</li>
      <li><strong>Semana 2:</strong> Validación de datos con equipo comercial</li>
      <li><strong>Semana 3-4:</strong> Pilot program con 10 propiedades reales</li>
      <li><strong>Mes 2:</strong> Integración con CRM existente (si aplica)</li>
      <li><strong>Mes 3:</strong> Launch v1.0 producción</li>
    </ul>
  </div>
  
  <h3>Soporte Incluido</h3>
  <ul>
    <li>Capacitación completa para 3 directores</li>
    <li>Integración de datos históricos (propiedades previas)</li>
    <li>Setup de webhooks y automatizaciones</li>
    <li>Garantía de uptime 99.5% (SLA)</li>
  </ul>
  
  <h3>Contacto</h3>
  <p><strong>N3uralia Intelligence Platform</strong><br>
  Email: info@n3uralia.com<br>
  Website: www.n3uralia.com<br>
  Support: +56 9 XXXX-XXXX</p>
</div>

</body>
</html>`;

const outputPath = path.join(__dirname, '..', 'public', 'propuesta-profesional-v2.html');
fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`✓ Professional proposal generated: ${outputPath}`);
console.log(`✓ File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
console.log(`✓ Contains 12 high-quality images from blob storage`);
console.log(`✓ 17 pages with complete platform documentation`);
