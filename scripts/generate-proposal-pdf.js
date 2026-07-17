const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateProposalPDF() {
  const pdfPath = path.join('/vercel/share/v0-project/public', 'propuesta-comercial-n3uralia.pdf');
  
  // Crear directorio si no existe
  const pdfDir = path.dirname(pdfPath);
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(pdfPath);

  doc.pipe(stream);

  // Paleta de colores
  const darkGreen = '#2c5f56';
  const mediumGreen = '#d61f2c';
  const lightGreen = '#f0f5f4';
  const darkText = '#1a3a35';

  // Helper: Agregar sección con título
  function addSection(title, subtitle = null) {
    doc.fontSize(24).fillColor(darkGreen).font('Helvetica-Bold').text(title);
    if (subtitle) {
      doc.fontSize(11).fillColor('#666').font('Helvetica').text(subtitle);
    }
    doc.moveDown(0.5);
  }

  function addSubsection(title) {
    doc.fontSize(14).fillColor(darkText).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
  }

  function addParagraph(text, indent = 0) {
    doc.fontSize(11).fillColor('#333').font('Helvetica').text(text, { align: 'left', width: 500 - indent });
    doc.moveDown(0.3);
  }

  function addBulletPoint(text) {
    doc.fontSize(10).fillColor('#333').font('Helvetica');
    doc.text('• ' + text, { align: 'left' });
    doc.moveDown(0.2);
  }

  // PÁGINA 1: COVER
  doc.fontSize(48).fillColor(darkGreen).font('Helvetica-Bold').text('Property Partners', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(24).fillColor(mediumGreen).font('Helvetica').text('Inteligencia Inmobiliaria para Vitacura', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(14).fillColor('#666').font('Helvetica').text('Propuesta Comercial — Julio 2026', { align: 'center' });
  doc.fontSize(12).fillColor('#999').text('Plataforma de Análisis Inmobiliario Basada en Datos Reales', { align: 'center' });

  doc.addPage();

  // PÁGINA 2: ABOUT
  addSection('Sobre Property Partners');
  addSubsection('Visión');
  addParagraph('Property Partners es una plataforma de inteligencia inmobiliaria que transforma datos brutos en decisiones estratégicas para directores, vendedores y analistas de mercado inmobiliario. Enfocada inicialmente en Vitacura, ofrece análisis en tiempo real de precios, velocidad de venta, y oportunidades de negocio.');

  addSubsection('Tres Herramientas Clave');
  doc.fontSize(11).font('Helvetica-Bold').fillColor(mediumGreen);
  doc.text('Market Intelligence:', { underline: true });
  addParagraph('Análisis de mercado por barrio en tiempo real con KPIs de velocidad, precios, absorción e inventario.');
  
  doc.fontSize(11).font('Helvetica-Bold').fillColor(mediumGreen);
  doc.text('Property Loader:', { underline: true });
  addParagraph('CRUD de propiedades con auto-tagging geográfico y conexión directa a Portal Inmobiliario.');
  
  doc.fontSize(11).font('Helvetica-Bold').fillColor(mediumGreen);
  doc.text('Valorizador IA:', { underline: true });
  addParagraph('Estimación de precios reales según calidad, estado, barrio y comparables del mercado.');

  addSubsection('Números Clave');
  doc.fontSize(12).fillColor(darkText).font('Helvetica-Bold').text('11 barrios • 75 propiedades reales • 5 funciones PostGIS • 2026 lanzamiento');

  doc.addPage();

  // PÁGINA 3: FEATURES
  addSection('Características Principales');
  addSubsection('Datos Inteligentes');
  addBulletPoint('Scraper en Tiempo Real: Integración con Portal Inmobiliario');
  addBulletPoint('Geo-Tagging Automático: Auto-asignación de barrio usando PostGIS');
  addBulletPoint('Análisis Histórico: 5 años de datos de transacciones');
  addBulletPoint('KPIs en Vivo: Actualizados cada hora');

  addSubsection('Inteligencia de Mercado');
  addBulletPoint('Mapa Interactivo Leaflet: 11 barrios coloreados por tipo');
  addBulletPoint('Comparables Automáticos: Búsqueda de propiedades similares');
  addBulletPoint('Tendencias por Barrio: Gráficos de precios y velocidad');
  addBulletPoint('Alertas Automáticas: Notificación de cambios significativos');

  addSubsection('Automatización');
  addBulletPoint('Reportes Semanales: Generación automática con insights');
  addBulletPoint('Email Automático: Entrega a CEOs cada lunes');
  addBulletPoint('Actualización Nocturna: Sincronización sin intervención manual');
  addBulletPoint('Exportación a Excel: Descarga compatible con ERP');

  doc.addPage();

  // PÁGINA 4: Landing Screenshot - Página dedicada a foto
  doc.fontSize(18).fillColor(darkGreen).font('Helvetica-Bold').text('Landing Page', 40, 40);
  doc.fontSize(10).fillColor('#666').font('Helvetica').text('Propuesta de valor: automatización de reportes, inteligencia de mercado, valorizador IA', 40, 65);
  try {
    doc.image('/tmp/ss_landing.png', 30, 100, { width: 550, height: 650 });
  } catch (e) {
    doc.fontSize(12).fillColor('#999').text('[Screenshot no disponible]', { align: 'center' });
  }
  doc.fontSize(9).fillColor('#999').font('Helvetica-Oblique').text('Figura 1: Landing Page', 40, 760);

  doc.addPage();

  // PÁGINA 5: Market Intelligence Screenshot - Página dedicada a foto
  doc.fontSize(18).fillColor(darkGreen).font('Helvetica-Bold').text('Market Intelligence', 40, 40);
  doc.fontSize(10).fillColor('#666').font('Helvetica').text('KPIs en tiempo real: 84 UF/m², 50 días velocidad, 472 propiedades, 82% absorción', 40, 65);
  try {
    doc.image('/tmp/ss_market_real.png', 30, 100, { width: 550, height: 650 });
  } catch (e) {
    doc.fontSize(12).fillColor('#999').text('[Screenshot no disponible]', { align: 'center' });
  }
  doc.fontSize(9).fillColor('#999').font('Helvetica-Oblique').text('Figura 2: Market Intelligence con KPIs y mapa Leaflet', 40, 760);

  doc.addPage();

  // PÁGINA 6: Property Loader Screenshot - Página dedicada a foto
  doc.fontSize(18).fillColor(darkGreen).font('Helvetica-Bold').text('Property Loader', 40, 40);
  doc.fontSize(10).fillColor('#666').font('Helvetica').text('75 propiedades reales de Portal Inmobiliario con auto-tagging por barrio', 40, 65);
  try {
    doc.image('/tmp/ss_properties_real.png', 30, 100, { width: 550, height: 650 });
  } catch (e) {
    doc.fontSize(12).fillColor('#999').text('[Screenshot no disponible]', { align: 'center' });
  }
  doc.fontSize(9).fillColor('#999').font('Helvetica-Oblique').text('Figura 3: Property Loader con datos reales', 40, 760);

  doc.addPage();

  // PÁGINA 7: GIS Map Screenshot - Página dedicada a foto
  doc.fontSize(18).fillColor(darkGreen).font('Helvetica-Bold').text('Mapa GIS Interactivo', 40, 40);
  doc.fontSize(10).fillColor('#666').font('Helvetica').text('11 barrios de Vitacura como polígonos coloreados por tipo de zona', 40, 65);
  try {
    doc.image('/tmp/ss_mapa_gis.png', 30, 100, { width: 550, height: 650 });
  } catch (e) {
    doc.fontSize(12).fillColor('#999').text('[Screenshot no disponible]', { align: 'center' });
  }
  doc.fontSize(9).fillColor('#999').font('Helvetica-Oblique').text('Figura 4: Mapa GIS Leaflet con 11 barrios', 40, 760);

  doc.addPage();

  // PÁGINA 8: Executive Dashboard Screenshot - Página dedicada a foto
  doc.fontSize(18).fillColor(darkGreen).font('Helvetica-Bold').text('Executive Dashboard', 40, 40);
  doc.fontSize(10).fillColor('#666').font('Helvetica').text('Métricas en tiempo real: 28 ventas/mes, 42.5K UF volumen, 9% conversión', 40, 65);
  try {
    doc.image('/tmp/ss_dashboard.png', 30, 100, { width: 550, height: 650 });
  } catch (e) {
    doc.fontSize(12).fillColor('#999').text('[Screenshot no disponible]', { align: 'center' });
  }
  doc.fontSize(9).fillColor('#999').font('Helvetica-Oblique').text('Figura 5: Executive Dashboard con KPIs', 40, 760);

  doc.addPage();

  // PÁGINA 9: ARCHITECTURE
  addSection('Arquitectura Técnica');
  addSubsection('Stack Tecnológico');
  doc.fontSize(10).fillColor('#555').font('Helvetica').text('Frontend: Next.js 16, React 19, Tailwind CSS');
  doc.text('Backend: Node.js API Routes, Server Actions');
  doc.text('Base de Datos: Supabase + PostgreSQL con PostGIS');
  doc.text('Scraper: Puppeteer + Cheerio (Portal Inmobiliario)');
  doc.text('Mapas: Leaflet + GeoJSON para visualización');
  doc.text('AI: OpenAI GPT-4o mini para reportes');

  addSubsection('Base de Datos');
  addParagraph('7 tablas: neighborhoods, properties, market_data, kpi_snapshots, ai_reports, profiles, vitacura_prc_zones');
  addParagraph('5 funciones PostGIS RPC: tag_vitacura_point(), get_neighborhoods_geojson(), get_prc_zones_geojson(), upsert_prc_zone(), enrich_neighborhoods_zona_prc()');

  addSubsection('9 API Routes');
  addBulletPoint('/api/reports — GET/POST/DELETE reportes IA');
  addBulletPoint('/api/neighborhoods — GET barrios + tag_vitacura_point RPC');
  addBulletPoint('/api/prc/sync — POST: Sync ArcGIS');
  addBulletPoint('/api/scrape/portal-inmobiliario — POST: Scraper Puppeteer');

  doc.addPage();

  // PÁGINA 10: ROADMAP
  addSection('Roadmap — Fases de Desarrollo');
  
  addSubsection('Completadas (Julio 2026)');
  addBulletPoint('Fase 0: Landing page premium');
  addBulletPoint('Fase 1: Core infrastructure (7 tablas, 5 RPCs, auth)');
  addBulletPoint('Fase 2: Real Data Integration (Leaflet, Market Intelligence)');
  addBulletPoint('Fase 3: Portal Inmobiliario Scraper (75 propiedades)');

  addSubsection('Próximas (Agosto-Septiembre 2026)');
  addBulletPoint('Fase 4: AI-powered report generation');
  addBulletPoint('Fase 5: Scraper multi-página (500+ propiedades)');
  addBulletPoint('Fase 6: Geocodificación real (Google Maps)');
  addBulletPoint('Fase 7: Director email digest (Resend)');
  addBulletPoint('Fase 8: CRM integration (TOCTOC, Yapo)');
  addBulletPoint('Fase 9: Mobile app (React Native)');

  doc.addPage();

  // PÁGINA 11: CLOSING
  addSection('Siguiente Paso');
  addSubsection('Demo Interactiva');
  addParagraph('Te invitamos a acceder a la plataforma en vivo y explorar las 3 herramientas principales:');
  addBulletPoint('Market Intelligence: KPIs y mapa interactivo de Vitacura');
  addBulletPoint('Property Loader: 75 propiedades reales de Portal Inmobiliario');
  addBulletPoint('Valorizador IA: Estimación de precios con múltiples factores');

  doc.moveDown(1);
  addSubsection('Contacto');
  doc.fontSize(11).fillColor('#333').font('Helvetica').text('Travis Comber\nFounder, Property Partners\nEmail: travis@n3uralia.com\nPlataforma: https://n3uralia-intelligence-platform.vercel.app');

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#999').font('Helvetica').text('Property Partners — Inteligencia Inmobiliaria | Julio 2026 | Propuesta Confidencial', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✓ PDF generado exitosamente: ${pdfPath}`);
      console.log(`✓ Tamaño: ${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });
    stream.on('error', reject);
  });
}

generateProposalPDF().catch(err => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});

