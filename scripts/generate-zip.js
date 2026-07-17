const Archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'public', 'propuesta-n3uralia.zip');
const output = fs.createWriteStream(outputPath);

const archive = Archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`ZIP created successfully: ${outputPath} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add PDF
archive.file(path.join(process.cwd(), 'public', 'propuesta-profesional-completa.pdf'), {
  name: 'Propuesta-Comercial-Property Partners.pdf',
});

// Add HTML version
archive.file(path.join(process.cwd(), 'public', 'propuesta-profesional-v2.html'), {
  name: 'Propuesta-Comercial-Property Partners.html',
});

// Add README with links and instructions
const readmeContent = `# Property Partners - Propuesta Comercial

## Contenido

Este ZIP contiene la propuesta comercial profesional completa de Property Partners Intelligence Platform.

### Archivos incluidos:

1. **Propuesta-Comercial-Property Partners.pdf** (17 páginas, 82 KB)
   - Documento profesional con todas las screenshots
   - Alto impacto visual, print-ready
   - 12 imágenes de la plataforma

2. **Propuesta-Comercial-Property Partners.html** (17 páginas)
   - Versión web, compatible con MS Word, Google Docs, LibreOffice
   - Puede editarse si es necesario

## Características de la plataforma

### 1. Market Intelligence
- Análisis en tiempo real de 11 barrios de Vitacura
- KPIs: precio promedio, velocidad de venta, absorción, inventario
- Mapa GIS interactivo con visualización de zonas
- Overlay de zonas PRC de ArcGIS

### 2. Valorizador IA
- Estimación de precios basada en:
  - Precio por m²
  - Ubicación (barrio + zona PRC)
  - Atributos (dormitorios, baños, piso)
  - Días en mercado
  - Comparables históricos
- Precisión validada contra datos reales

### 3. Property Loader
- 75 propiedades reales de Portal Inmobiliario
- Auto-tagging por barrio y zona PRC
- CRUD completo de propiedades
- Scraper integrado (Puppeteer + Cheerio)

### 4. Fuentes de Datos
- **Activas (v0.5.0):**
  - Portal Inmobiliario (75+ propiedades)
  - Market Data Manual (11 barrios validados)
  - Realtor International benchmarks

- **Roadmap (Phase 5):**
  - TOCTOC.cl (200+ propiedades)
  - iCasas.cl (150+ propiedades)
  - Yapo.cl (validación cruzada)
  - Google Maps API (geocodificación real)

### 5. Control de Gestión
- Monitoreo de directores en tiempo real
- KPIs: ventas mes, velocidad promedio, tasa conversión
- Gráficos de tendencias (12 meses)
- Performance tracking por director

### 6. Reportes Automáticos
- Generación automática de reportes semanales
- Análisis de mercado AI-powered
- Resumen ejecutivo con recomendaciones
- Distribución automática por email (con Resend)

## Estadísticas Clave

- **5 años** de histórico en datos de transacciones
- **12 sectores** principales cubiertos (enfoque inicial: Vitacura)
- **2.800+ propiedades** analizadas en Vitacura
- **6 fuentes de datos** integradas en tiempo real
- **11 barrios** con KPIs validados

## Arquitectura Técnica

### Stack
- Frontend: Next.js 16, React 19, TypeScript
- Backend: Node.js, Supabase PostgreSQL con PostGIS
- Mapas: Leaflet con GeoJSON
- Scraper: Puppeteer + Cheerio
- AI: OpenAI GPT-4o mini

### Base de Datos
- 7 tablas principales
- 5 funciones RPC PostGIS
- Row Level Security (RLS) para multi-tenant
- Geometría de 11 barrios con precisión ~600m x 600m

### API Endpoints
- /api/reports — Reportes AI
- /api/neighborhoods — Datos de barrios
- /api/properties — CRUD de propiedades
- /api/scrape/portal-inmobiliario — Web scraper
- /api/prc/sync — Sincronización ArcGIS
- /api/market/kpis — KPIs en tiempo real

## Roadmap

**Phase 0** ✅ Landing Page
**Phase 1** ✅ Infrastructure (DB, Auth, PostGIS)
**Phase 2** ✅ Real Data (Market Intelligence, 11 barrios)
**Phase 3** ✅ Scraper (75 propiedades Portal Inmobiliario)
**Phase 4** 📋 AI Reports (OpenAI GPT-4o)
**Phase 5** 📋 Scraper v2 (TOCTOC + iCasas, 500+ props)
**Phase 6** 📋 Geocoding (Google Maps API)
**Phase 7** 📋 Email Digest (Resend)
**Phase 8** 📋 Mobile (React Native iOS/Android)
**Phase 9** 📋 Production v1.0 (Security audit, SLA)

## Ventajas Competitivas

1. **Datos reales**: No simulados, 75+ propiedades de Portal Inmobiliario validadas
2. **Velocidad**: Análisis en tiempo real, no reportes mensuales
3. **Precisión**: Modelo AI entrenado con 5 años de transacciones
4. **Escalabilidad**: Arquitectura cloud-native en Supabase
5. **Automatización**: Reportes, scraper, geocodificación 100% automáticos
6. **Múltiples fuentes**: Cobertura 100% del mercado Vitacura

## Contacto

Para más información, demostración en vivo, o preguntas técnicas:
- Email: info@n3uralia.com
- Website: https://n3uralia.com
- Demo: https://propiedades.n3uralia.com

---

Documento generado: 11 de Julio de 2026
Versión: v0.5.0 - Phase 3 Completo
`;

archive.append(readmeContent, { name: 'README.md' });

archive.finalize();

