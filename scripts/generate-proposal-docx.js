const fs = require('fs');
const path = require('path');

// Convert image to base64
function imageToBase64(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    return 'data:image/png;base64,' + buffer.toString('base64');
  } catch (e) {
    console.warn(`Could not read image: ${imagePath}`);
    return null;
  }
}

// Get image dimensions
function getImageWidth(imagePath) {
  // Assume all images have similar aspect ratio - use max width 600
  return 600;
}

// HTML template
const img_landing = imageToBase64('/tmp/ss_landing.png');
const img_market = imageToBase64('/tmp/ss_market_real.png');
const img_properties = imageToBase64('/tmp/ss_properties_real.png');
const img_map = imageToBase64('/tmp/ss_mapa_gis.png');
const img_dashboard = imageToBase64('/tmp/ss_dashboard.png');

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Partners Intelligence Platform - Propuesta Comercial</title>
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: Calibri, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    .page {
      page-break-after: always;
      padding: 40px;
      min-height: 100vh;
    }
    .cover {
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .cover h1 {
      font-size: 56px;
      color: #2D5016;
      margin: 20px 0;
      font-weight: bold;
    }
    .cover .subtitle {
      font-size: 36px;
      color: #4A9B6F;
      margin: 10px 0;
    }
    .cover .description {
      font-size: 22px;
      color: #666;
      margin: 20px 0;
    }
    .cover .features {
      margin: 40px 0;
      font-size: 20px;
      color: #4A9B6F;
    }
    .cover .features p {
      margin: 10px 0;
    }
    .cover .date {
      margin-top: 100px;
      font-size: 18px;
      color: #999;
    }
    h2 {
      font-size: 28px;
      color: #2D5016;
      border-bottom: 3px solid #2D5016;
      padding-bottom: 10px;
      margin-bottom: 20px;
      background: #E8F4E1;
      padding: 10px;
    }
    h3 {
      font-size: 20px;
      color: #2D5016;
      margin: 20px 0 10px 0;
    }
    p {
      font-size: 14px;
      margin: 10px 0;
      text-align: justify;
    }
    ul {
      margin: 10px 0 10px 20px;
    }
    li {
      font-size: 14px;
      margin: 5px 0;
    }
    .screenshot {
      text-align: center;
      margin: 20px 0;
    }
    .screenshot img {
      max-width: 600px;
      width: 100%;
      height: auto;
      border: 1px solid #ddd;
    }
    .screenshot-caption {
      font-size: 12px;
      color: #999;
      margin-top: 10px;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }
    table th {
      background: #2D5016;
      color: white;
      padding: 10px;
      text-align: left;
      border: 1px solid #2D5016;
    }
    table td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .section {
      margin: 20px 0;
    }
  </style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page cover">
  <h1>N3URALIA</h1>
  <p class="subtitle">Intelligence Platform</p>
  <p class="description">Propuesta Comercial</p>
  <p class="description" style="font-size: 18px;">Plataforma de Inteligencia para Mercado Inmobiliario Vitacura</p>
  
  <div class="features">
    <p>📊 75 Propiedades Reales</p>
    <p>📍 11 Barrios de Vitacura</p>
    <p>🗺️ Mapa GIS Interactivo</p>
    <p>💰 Valorizador Multi-Factor</p>
  </div>
  
  <p class="date">Julio 2026</p>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="page">
  <h2>Resumen Ejecutivo</h2>
  <p>Property Partners Intelligence Platform es una solución integral de inteligencia de mercado diseñada específicamente para el sector inmobiliario chileno. La plataforma integra datos reales de Portal Inmobiliario, análisis geoespacial con PostGIS, y algoritmos de machine learning para proporcionar insights accionables.</p>
  
  <h3>Características Clave:</h3>
  <ul>
    <li>Market Intelligence: KPIs en tiempo real de 11 barrios de Vitacura</li>
    <li>Property Loader: 75 propiedades reales con auto-tagging geoespacial</li>
    <li>Valorizador IA: Multi-factor model para estimación de precios</li>
    <li>Mapa Interactivo: Leaflet GIS con polígonos por barrio y KPIs</li>
    <li>Reportes Semanales: Análisis automatizado y distribuible</li>
  </ul>
  
  <h3>Stack Tecnológico:</h3>
  <p>Next.js 16 • React 19 • Supabase PostGIS • Leaflet Maps • Puppeteer Scraper • OpenAI GPT-4o</p>
</div>

<!-- PAGE 3: LANDING PAGE SCREENSHOT -->
<div class="page">
  <h2>Landing Page</h2>
  <p>La interfaz principal presenta la propuesta de valor: automatización de reportes, inteligencia de mercado, y valorizador que pondera la calidad real de cada propiedad.</p>
  ${img_landing ? `<div class="screenshot"><img src="${img_landing}" /><p class="screenshot-caption">Figura 1: Landing Page</p></div>` : '<p>[Screenshot no disponible]</p>'}
</div>

<!-- PAGE 4: MARKET INTELLIGENCE -->
<div class="page">
  <h2>Market Intelligence Dashboard</h2>
  <p>Panel con KPIs en tiempo real: precio promedio 84 UF/m², velocidad promedio 50 días, inventario 472 propiedades, absorción 82%. Incluye mapa Leaflet interactivo con estadísticas por barrio.</p>
  ${img_market ? `<div class="screenshot"><img src="${img_market}" /><p class="screenshot-caption">Figura 2: Market Intelligence con KPIs y mapa Leaflet</p></div>` : '<p>[Screenshot no disponible]</p>'}
</div>

<!-- PAGE 5: PROPERTY LOADER -->
<div class="page">
  <h2>Property Loader - 75 Propiedades Reales</h2>
  <p>Tabla de propiedades cargadas desde Portal Inmobiliario con auto-tagging por barrio. Cada propiedad incluye dirección, precio UF, área m², dormitorios, baños, y días en mercado. Los datos se actualizan mediante scraper automatizado.</p>
  ${img_properties ? `<div class="screenshot"><img src="${img_properties}" /><p class="screenshot-caption">Figura 3: Property Loader con datos reales</p></div>` : '<p>[Screenshot no disponible]</p>'}
</div>

<!-- PAGE 6: GIS MAP -->
<div class="page">
  <h2>Mapa GIS Interactivo</h2>
  <p>Visualización Leaflet de 11 barrios de Vitacura como polígonos coloreados por tipo de zona. Cada polígono es clickeable para ver KPIs del barrio en tiempo real: precio, velocidad, absorción, e inventario.</p>
  ${img_map ? `<div class="screenshot"><img src="${img_map}" /><p class="screenshot-caption">Figura 4: Mapa GIS Leaflet con 11 barrios de Vitacura</p></div>` : '<p>[Screenshot no disponible]</p>'}
</div>

<!-- PAGE 7: EXECUTIVE DASHBOARD -->
<div class="page">
  <h2>Executive Dashboard</h2>
  <p>Métricas ejecutivas en tiempo real: 28 ventas mes, 42.5K UF volumen, 9% tasa conversión, 184 propiedades en stock activo. Incluye gráficos de tendencia e históricos para análisis comparativo.</p>
  ${img_dashboard ? `<div class="screenshot"><img src="${img_dashboard}" /><p class="screenshot-caption">Figura 5: Executive Dashboard con KPIs</p></div>` : '<p>[Screenshot no disponible]</p>'}
</div>

<!-- PAGE 8: ARCHITECTURE -->
<div class="page">
  <h2>Arquitectura Técnica</h2>
  
  <h3>Infraestructura de Base de Datos</h3>
  <p>La plataforma utiliza Supabase (PostgreSQL + PostGIS) con 7 tablas principales:</p>
  <ul>
    <li>neighborhoods (11 filas): 11 barrios con geometría PostGIS</li>
    <li>properties (75 filas): Propiedades reales con lat/lng</li>
    <li>market_data: KPIs por barrio (precio, velocidad, absorción)</li>
    <li>kpi_snapshots: Históricos de KPIs para tendencias</li>
    <li>ai_reports: Reportes generados automáticamente</li>
    <li>vitacura_prc_zones: Zonas PRC sincronizadas desde ArcGIS</li>
    <li>profiles: Usuarios con roles (admin, seller, director)</li>
  </ul>
  
  <h3>Funciones PostGIS RPC</h3>
  <ul>
    <li>tag_vitacura_point(lat, lng): Auto-asigna barrio a coordenada</li>
    <li>get_neighborhoods_geojson(): Retorna barrios como GeoJSON</li>
    <li>get_prc_zones_geojson(): Retorna zonas PRC como GeoJSON</li>
    <li>upsert_prc_zone(): Sincroniza zonas desde ArcGIS</li>
    <li>enrich_neighborhoods_zona_prc(): Actualiza geometría post-sync</li>
  </ul>
</div>

<!-- PAGE 9: WEB SCRAPER TECHNICAL -->
<div class="page">
  <h2>Web Scraper — Portal Inmobiliario</h2>
  
  <h3>Tecnología</h3>
  <p><strong>Puppeteer + Cheerio:</strong> Headless Chrome automation que navega portalinmobiliario.com. Extrae 75+ propiedades por ejecución usando selectores CSS confirmados en producción.</p>

  <h3>Selectores Confirmados</h3>
  <ul style="margin-left: 20px; font-size: 13px;">
    <li>[class*="ui-search-result"] — Cards de propiedades (49 por página)</li>
    <li>[class*="title"] — Nombre/proyecto del inmueble</li>
    <li>[class*="price"] — Precio en UF (ej: "7.990")</li>
    <li>[class*="location"] — Dirección y zona</li>
    <li>[class*="attribute"] — Bedrooms, bathrooms, área m²</li>
  </ul>

  <h3>Parsing Inteligente</h3>
  <ul style="margin-left: 20px; font-size: 13px;">
    <li><strong>Precios UF:</strong> "7.990" (punto = miles) → 7990 UF automáticamente</li>
    <li><strong>Rangos:</strong> "2 a 4 dormitorios" → mediana (3)</li>
    <li><strong>Geo-tagging:</strong> Dirección → sector Vitacura → barrio + zona PRC</li>
    <li><strong>Validación:</strong> Verifica precio, área, coordenadas antes de insertar</li>
    <li><strong>Rate Limiting:</strong> 300ms entre requests, User-Agent rotativo</li>
  </ul>

  <h3>Seguridad & Confiabilidad</h3>
  <p>Service role key bypasea RLS para batch inserts. Fallback automático a retry si falla parsing. Resultados: <strong>75 propiedades reales</strong> importadas en producción.</p>
</div>

<!-- PAGE 10: MÚLTIPLES FUENTES DE DATOS -->
<div class="page">
  <h2>Múltiples Fuentes de Datos</h2>
  
  <h3>Fase Actual (v0.5.0 - Julio 2026)</h3>
  <ul style="margin-left: 20px; font-size: 13px;">
    <li><strong>Portal Inmobiliario:</strong> 75+ propiedades Vitacura (en producción)</li>
    <li><strong>Market Data Manual:</strong> 11 barrios con KPIs validados</li>
    <li><strong>Realtor Benchmarks:</strong> Precios internacionales (preparado)</li>
  </ul>

  <h3>Roadmap — Phase 5 (Agosto 2026)</h3>
  <ul style="margin-left: 20px; font-size: 13px;">
    <li><strong>TOCTOC.cl:</strong> 200+ propiedades Vitacura</li>
    <li><strong>iCasas.cl:</strong> 150+ propiedades (cobertura redundante)</li>
    <li><strong>Yapo.cl:</strong> Validación cruzada de precios</li>
    <li><strong>Google Maps API:</strong> Geocodificación real automática</li>
  </ul>

  <h3>Consolidación & Ventajas</h3>
  <p><strong>Deduplicación:</strong> Mismo inmueble puede aparecer en múltiples fuentes. Sistema automático de detección por lat/lng + precio. <strong>Ventajas:</strong> 100% cobertura del mercado, validación cruzada de precios, redundancia, detección de manipulación de precios en tiempo real.</p>
</div>

<!-- PAGE 11: API ROUTES -->
<div class="page">
  <h2>API Routes & Endpoints</h2>
  <p>La plataforma expone 9 endpoints REST para integración:</p>
  
  <table>
    <tr>
      <th>Endpoint</th>
      <th>Método</th>
      <th>Descripción</th>
    </tr>
    <tr>
      <td>/api/reports</td>
      <td>GET/POST/DELETE</td>
      <td>Gestión de reportes IA</td>
    </tr>
    <tr>
      <td>/api/neighborhoods</td>
      <td>GET</td>
      <td>Lista 11 barrios con KPIs</td>
    </tr>
    <tr>
      <td>/api/neighborhoods/geojson</td>
      <td>GET</td>
      <td>GeoJSON para Leaflet</td>
    </tr>
    <tr>
      <td>/api/prc/sync</td>
      <td>POST</td>
      <td>Sync ArcGIS → DB</td>
    </tr>
    <tr>
      <td>/api/prc/zones</td>
      <td>GET</td>
      <td>Zonas PRC como GeoJSON</td>
    </tr>
    <tr>
      <td>/api/scrape/portal</td>
      <td>POST</td>
      <td>Scraper 75 propiedades</td>
    </tr>
    <tr>
      <td>/api/valorizador</td>
      <td>POST</td>
      <td>Multi-factor pricing</td>
    </tr>
    <tr>
      <td>/api/download/propuesta-pdf</td>
      <td>GET</td>
      <td>Descarga propuesta</td>
    </tr>
    <tr>
      <td>/api/download/propuesta-docx</td>
      <td>GET</td>
      <td>Descarga documento Word</td>
    </tr>
  </table>
</div>

<!-- PAGE 10: ROADMAP -->
<div class="page">
  <h2>Roadmap de Desarrollo</h2>
  
  <h3>Phases Completadas (Julio 10, 2026)</h3>
  <ul>
    <li>Phase 0: Landing Page — Propuesta de valor, equipo, contacto</li>
    <li>Phase 1: Infrastructure — BD, auth, RPCs PostGIS</li>
    <li>Phase 2: Real Data — Market Intelligence, Leaflet map, 11 barrios + geometría</li>
    <li>Phase 3: Scraper — Puppeteer + Cheerio, 75 propiedades Portal Inmobiliario</li>
  </ul>
  
  <h3>Próximas Fases (Agosto - Octubre 2026)</h3>
  <ul>
    <li>Phase 4: AI Reports — OpenAI GPT-4o, generación automática</li>
    <li>Phase 5: Scraper v2 — Multi-pagina (500+ propiedades), TOCTOC + iCasas</li>
    <li>Phase 6: Geocoding — Google Maps API, ubicación real → barrio automático</li>
    <li>Phase 7: Email Digest — Resend, reportes semanales a director</li>
    <li>Phase 8: Mobile — React Native, app iOS/Android</li>
    <li>Phase 9: v1.0 Production — Security audit, performance, SLA</li>
  </ul>
</div>

<!-- PAGE 11: CONTACT & CLOSING -->
<div class="page">
  <h2>Próximos Pasos</h2>
  <ul>
    <li>Demostración en vivo de plataforma (30 minutos)</li>
    <li>Validación de datos con equipo comercial (1 semana)</li>
    <li>Pilot program: 10 propiedades reales (2 semanas)</li>
    <li>Integración con CRM existente (1 mes)</li>
    <li>Launch v1.0 producción (2 meses)</li>
  </ul>
  
  <h2 style="margin-top: 40px;">Contacto</h2>
  <p><strong>Travis Comber</strong> — CEO & Product</p>
  <p>Email: travis@n3uralia.com</p>
  <p>Celular: +56 9 XXXX XXXX</p>
  <p>Website: https://n3uralia-intelligence-platform.vercel.app</p>
  
  <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
  
  <p style="text-align: center; margin-top: 40px;">
    <strong>Property Partners Intelligence Platform v0.5.0</strong><br>
    Julio 2026 — Propuesta Comercial
  </p>
</div>

</body>
</html>
`;

// Write HTML to file (also useful for viewing in browser)
fs.writeFileSync(path.join(__dirname, '../public/propuesta-comercial-n3uralia.html'), html);
console.log('✅ HTML file generated: public/propuesta-comercial-n3uralia.html');

// For DOCX, we'll need to use a different approach - create a simple binary wrapper
// Using mammoth or similar would be better, but for now let's create the HTML that can be converted
const DocxModule = require('html-docx-js');

// Convert HTML to DOCX
const converted = DocxModule.asBlob(html);
fs.writeFileSync(path.join(__dirname, '../public/propuesta-comercial-n3uralia.docx'), converted);
console.log('✅ DOCX file generated: public/propuesta-comercial-n3uralia.docx');

