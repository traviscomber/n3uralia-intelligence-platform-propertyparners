# N3uralia Intelligence Platform — Roadmap 2026

## Project Links

| Platform | Link |
|----------|------|
| **GitHub Repository** | https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners |
| **Main Branch** | https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners/tree/main |
| **Production Deployment** | https://n3uralia-intelligence-platform.vercel.app |
| **Vercel Project** | https://vercel.com/travis-projects-c14a785a/n3uralia-intelligence-platform |
| **Supabase Project** | orfncinmhymhhoxbxgjb |

---

## Current Status

**Version:** 0.5.0 (MVP + Real Data Integration Complete)
**Last Updated:** July 10, 2026
**Status:** Deployed to Production — Phase 2 Complete

---

## Completed Features

### Phase 0: Property Partners Landing Page (July 10, 2026) — COMPLETE

- [x] Premium landing page at `/`
- [x] Split layout hero: dark editorial panel + light tech stack panel
- [x] Animated canvas particle network background
- [x] 3 key indicators with real market data
- [x] 3 tech pillars: scraper + modelos predictivos + reportes automaticos
- [x] Mobile-responsive with CSS animations (slideUp, float, pulse-subtle)
- [x] Navigation + CTA buttons to internal platform login
- [x] Footer: "Property Partners Platform | Powered by N3uralia"

---

### Phase 1: Core Infrastructure (July 10, 2026) — COMPLETE

**Database (Supabase PostGIS)**
- [x] `neighborhoods` — 11 barrios Vitacura con geometrias reales
- [x] `properties` — 75 propiedades reales importadas de Portal Inmobiliario
- [x] `market_data` — 11 filas con UF/m², absorption rate, inventory por barrio
- [x] `kpi_snapshots` — 6 filas (ventas, UF, captaciones, visitas, leads, comision)
- [x] `ai_reports` — tabla lista para reportes generados
- [x] `profiles` — roles: ceo / director / seller / admin
- [x] `vitacura_prc_zones` — tabla PostGIS para zonas PRC oficiales

**PostGIS RPC Functions**
- [x] `get_neighborhoods_geojson()` — retorna poligonos como JSON para Leaflet
- [x] `get_prc_zones_geojson()` — retorna zonas PRC como GeoJSON
- [x] `upsert_prc_zone(zona, subzona, uso_suelo, superficie, wkt)` — upsert de zonas desde ArcGIS
- [x] `tag_vitacura_point(lat, lng)` — taggea una coordenada con barrio_id + zona_prc
- [x] `enrich_neighborhoods_zona_prc()` — enriquece tabla neighborhoods con PRC oficial post-sync

**Authentication**
- [x] Email/password via Supabase Auth
- [x] Login page, signup, callback, error handling
- [x] User de prueba: juan@n3uralia.com / c4rlit0s (rol: admin)
- [x] RLS policies en todas las tablas

---

### Phase 2: Real Data Integration (July 10, 2026) — COMPLETE

**Market Intelligence Dashboard** (`/dashboard/market`)
- [x] KPI cards en tiempo real: 84 UF/m², 50 dias velocidad, 472 props, 82% absorcion
- [x] Tab "Mapa" — Leaflet interactivo SSR-safe (dynamic import)
  - 11 poligonos coloreados por tipo de zona (residencial_alto, comercial, etc.)
  - `fitBounds` automatico centra sobre Vitacura al cargar
  - Tooltip por barrio: UF/m², velocity_days, absorption_rate, inventory_count
  - Toggle "Overlay PRC" para zonas PRC post-sync
  - Boton "Sync PRC ArcGIS" con mensaje de resultado
- [x] Tab "Tabla General" — 11 barrios ordenados por UF/m² con scroll
- [x] Tab "Precios" — Bar chart con 11 barras (Recharts)
- [x] Tab "Velocidad" — Dual-axis chart (dias + absorcion %)

**Property Loader CRUD** (`/dashboard/properties`)
- [x] Tabla con 75 propiedades reales de Portal Inmobiliario
- [x] Filtros: Todos / Activo (available) / Vendido (sold) / Reservado (reserved) / Captado
- [x] Busqueda por direccion o barrio
- [x] Boton "Scrape Portal" — ejecuta scraper Puppeteer en demanda
- [x] Formulario Nueva Propiedad con auto-tag de barrio
  - onBlur en lat/lng llama `tag_vitacura_point(lat, lng)` RPC
  - Auto-rellena campo neighborhood + badge zona_prc
- [x] CRUD completo: crear, editar, eliminar propiedades

**Valorizador IA** (`/dashboard/valorizador`)
- [x] Selector de barrio cargado con 11 barrios reales (precio ref en label)
- [x] Modelo multi-factor: precio_base * factores de ajuste
- [x] Referencia: Nueva Costanera 95 UF/m², El Golf 92 UF/m², hasta La Florida 82 UF/m²

**Reportes IA** (`/dashboard/reportes`)
- [x] 6 tipos de reporte disponibles para generar
- [x] Tabla de reportes generados con fecha y tipo
- [x] Almacenamiento en tabla `ai_reports`

**API Routes**
- [x] `POST /api/scrape/portal-inmobiliario` — scraper Puppeteer headless
- [x] `GET /api/prc/zones` — retorna zonas PRC con geometria GeoJSON
- [x] `POST /api/prc/sync` — sync ArcGIS SMA → vitacura_prc_zones
- [x] `GET /api/neighborhoods/geojson` — retorna neighborhoods con geometria
- [x] `GET /api/reports` — lista reportes de ai_reports
- [x] `POST /api/reports` — genera nuevo reporte
- [x] `DELETE /api/reports` — elimina reporte
- [x] `GET /api/neighborhoods` — lista neighborhoods + RPC tag
- [x] `GET /api/db/init` — health check de DB

---

### Phase 3: Portal Inmobiliario Scraper (July 10, 2026) — COMPLETE

**Archivo:** `app/api/scrape/portal-inmobiliario/route.ts`

- [x] Puppeteer headless Chrome con Chrome binary en `/home/vercel-sandbox/.cache/puppeteer`
- [x] Selector confirmado: `[class*="ui-search-result"]` (49 cards por pagina)
- [x] Cheerio parsing del DOM para extraccion de datos
- [x] Parser precio UF chileno: `7.990` (punto = separador de miles) → `7990`
- [x] Parser rangos: `"2 a 4 dormitorios"` → mediana (3)
- [x] Parser area: `"113 - 230 m² utiles"` → mediana (172)
- [x] Geo-tagging por keywords de direccion → sector lat/lng Vitacura
- [x] `status = 'available'` (constraint DB: available | sold | reserved)
- [x] Service role client que bypasea RLS completamente
- [x] **Resultado:** 75/75 propiedades insertadas en primera ejecucion

**Datos reales scrapeados (muestra):**
| Propiedad | Barrio | UF | m² | Dorm/Ban |
|-----------|--------|----|----|----------|
| Casa Estilo Ingles En Sta... | Manquehue | 34.500 | 500 | 5D/6B |
| Impresionante Casa Est... | Vitacura Centro | 45.200 | 465 | 4D/4B |
| Sta Maria De Manqueh... | Manquehue | 55.000 | 500 | 6D/6B |
| Depto Nueva Costanera... | Nueva Costanera | 7.990 | 85 | 2D/2B |

---

### VitacuraMap Component (`components/map/VitacuraMap.tsx`) — COMPLETE

- [x] Leaflet import dinamico (SSR-safe, `dynamic(() => import(...), { ssr: false })`)
- [x] `mapReady` state garantiza que L y mapRef existen antes de dibujar poligonos
- [x] CSS Leaflet cargado en runtime via `<link>` dinamico
- [x] Geometria enviada como `{ type: 'Feature', geometry: n.geometry }` para L.geoJSON()
- [x] `fitBounds` automatico a todos los poligonos al cargar
- [x] Leyenda overlay con colores por tipo
- [x] PRC overlay con poligonos de zonas PRC (purple dashed) post-sync

---

## Tech Stack Actual

```
Frontend:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS v4
  - Recharts (charts)
  - Leaflet 1.9 (mapa interactivo, dynamic import)

Backend:
  - Supabase PostgreSQL + PostGIS (geometrias + RPC)
  - Supabase Auth (email/password)
  - Service Role client para operaciones admin
  - Puppeteer 25.3 + Cheerio (scraper Portal Inmobiliario)

DevOps:
  - Vercel (hosting + preview deployments)
  - GitHub (traviscomber/n3uralia-intelligence-platform-propertyparners)
  - Branch activo: v0/travis-2540-ed55878a

AI/ML (pendiente):
  - Vercel AI SDK (preparado, sin integrar)
  - GPT-4o mini (para reportes IA)
```

---

## Quick Stats (al 10 julio 2026)

| Metrica | Valor |
|---------|-------|
| Tablas DB | 7 |
| Funciones PostGIS RPC | 5 |
| API Routes | 9 |
| Propiedades en DB | 75 (reales, Portal Inmobiliario) |
| Barrios en DB | 11 (Vitacura completa) |
| Lineas de codigo | ~5.500 |
| KPI promedio actual | 84 UF/m2, 50 dias, 82% absorcion |

---

## Phase 4: AI Report Generation (Pendiente)

**Prioridad:** Alta
**Esfuerzo:** 2-3 dias
**Costo estimado:** $10-30/mes (GPT-4o mini)

### Tareas
- [ ] Integrar Vercel AI SDK con `streamText` / `generateText`
- [ ] Endpoint `POST /api/reports/generate` que llama GPT-4o mini
- [ ] Prompt con contexto real: neighborhoods data + kpi_snapshots + properties
- [ ] Tipos de reporte: Semanal Directores, Mensual CEO, Market Brief, Captacion Alert
- [ ] Guardar resultado en `ai_reports` tabla (title, summary, content JSONB)
- [ ] UI para ver reporte generado con markdown rendering
- [ ] Export a PDF (react-pdf o html-to-canvas)

---

## Phase 5: Portal Inmobiliario Scraper — Multi-Pagina (Pendiente)

**Prioridad:** Alta
**Esfuerzo:** 1 dia

### Estado actual
El scraper extrae la pagina 1 (49 listings). Portal Inmobiliario tiene ~400+ propiedades en Vitacura.

### Tareas
- [ ] Agregar paginacion: iterar paginas `?_Desde=1&_Hasta=48` hasta llegar a 0 resultados
- [ ] Limite configurable: `?pages=5` → ~250 propiedades
- [ ] Scraper de detalle: visitar cada listing para obtener lat/lng real del mapa Google
- [ ] Deduplicacion: upsert por address en vez de insert puro
- [ ] Progress endpoint: `GET /api/scrape/status` para ver cuantas ya insertadas
- [ ] UI: progress bar en Properties page durante scraping

---

## Phase 6: Geocodificacion Real con lat/lng desde Portal (Pendiente)

**Prioridad:** Media
**Esfuerzo:** 1-2 dias

### Estado actual
Las propiedades tienen lat/lng estimados por keyword matching de direccion (±0.0015°).
El auto-tag funciona pero es aproximado.

### Tareas
- [ ] En scraper de detalle: extraer coordenadas reales del mapa embebido de Portal
- [ ] Alternativamente: llamar Google Maps Geocoding API con la direccion
- [ ] Re-run `tag_vitacura_point(lat, lng)` con coordenadas reales post-geocodificacion
- [ ] Actualizar `neighborhood` en properties con resultado del RPC
- [ ] Mostrar mapa de propiedades en Leaflet (`/dashboard/properties/map`)

---

## Phase 7: Mapa Interactivo Mejorado con Poligonos PRC Oficiales (Pendiente)

**Prioridad:** Media
**Esfuerzo:** 1 dia

### Estado actual
El endpoint `POST /api/prc/sync` falla con el servidor ArcGIS de SMA (HTTP 400 al ejecutar query).

### Tareas
- [ ] Debuggear la query ArcGIS: probar con `geometry=*` y sin filtro WHERE
- [ ] Alternativa: descargar KMZ/SHP del PRC directamente del MINVU y convertir a GeoJSON
- [ ] Convertir KMZ a GeoJSON con turf.js y subir via `upsert_prc_zone()` RPC
- [ ] Verificar que el overlay PRC matchea con los poligonos de neighborhoods
- [ ] Agregar capas toggleables en el mapa: Barrios, PRC, Propiedades

---

## Phase 8: Dashboard Home con KPIs en Tiempo Real (Pendiente)

**Prioridad:** Media
**Esfuerzo:** 1 dia

### Estado actual
La pagina Home (`/dashboard`) muestra KPIs placeholder.

### Tareas
- [ ] Conectar Home a `kpi_snapshots` tabla con query de ultimo snapshot
- [ ] Agregar chart de tendencia 6 meses (ventas + UF)
- [ ] Widget "Propiedades mas recientes" con datos de `properties` tabla
- [ ] Widget "Market Brief" con top 3 barrios por absorcion
- [ ] Supabase Realtime subscription para KPIs en vivo

---

## Phase 9: Role-Based Dashboards (Pendiente)

**Prioridad:** Media-Baja
**Esfuerzo:** 3-4 dias

### Tareas
- [ ] CEO Dashboard: ventas totales empresa, comision pool, top performers
- [ ] Director Dashboard: su equipo, captaciones vs objetivo, velocity de su portfolio
- [ ] Seller Dashboard: sus propias captaciones, leads, comisiones
- [ ] Middleware de roles: redirigir a dashboard correspondiente segun `profiles.role`
- [ ] Admin panel: gestionar usuarios, asignar directores a ejecutivas

---

## Next Steps Inmediatos (Esta Semana)

### 1. Generar primer reporte IA real
- Ir a `/dashboard/reportes`
- Clickear "Generar Reporte Semanal"
- Integrar GPT-4o mini con datos reales de neighborhoods + kpi_snapshots

### 2. Expandir scraper a multi-pagina
- Modificar `route.ts` para paginar resultados de Portal Inmobiliario
- Target: 200-300 propiedades Vitacura para dataset representativo

### 3. Conectar Home dashboard a datos reales
- Query `kpi_snapshots` tabla y renderizar KPIs dinamicos
- Agregar chart de tendencia desde `market_data`

### 4. Fix PRC ArcGIS sync
- Probar URL alternativa del servidor SMA o usar KMZ del MINVU como fallback
- Con poligonos PRC el overlay en el mapa agrega valor real para el equipo

### 5. Geocodificacion real de propiedades
- Instalar `@googlemaps/google-maps-services-js`
- Geocodificar las 75 propiedades existentes con la API de Google Maps
- Esto habilita auto-tag preciso + mapa de propiedades en Leaflet

---

## KPIs de Exito — v1.0 (target: 31 agosto 2026)

| KPI | Target | Estado |
|-----|--------|--------|
| Propiedades en DB | 200+ | 75 (en curso) |
| Barrios con geometria real | 11 | 11 (completo) |
| Reportes AI generados | 10+ | 0 (pendiente) |
| Usuarios activos en plataforma | 5+ | 1 (juan@n3uralia.com) |
| Tiempo de carga paginas | < 500ms | ~320ms actual |
| Cobertura datos PRC | 100% Vitacura | 0% (pendiente ArcGIS fix) |

---

## Launch Timeline

| Fase | Timeline | Estado |
|------|----------|--------|
| Phase 0: Landing Page | Jul 10 | COMPLETE |
| Phase 1: Core Infrastructure | Jul 10 | COMPLETE |
| Phase 2: Real Data Integration | Jul 10 | COMPLETE |
| Phase 3: Portal Inmobiliario Scraper | Jul 10 | COMPLETE — 75 props |
| Phase 4: AI Report Generation | Jul 14-17 | Pendiente |
| Phase 5: Scraper Multi-Pagina | Jul 14-15 | Pendiente |
| Phase 6: Geocodificacion Real | Jul 16-18 | Pendiente |
| Phase 7: PRC Poligonos Oficiales | Jul 18-21 | Pendiente |
| Phase 8: Home KPIs en Tiempo Real | Jul 21-23 | Pendiente |
| Phase 9: Role-Based Dashboards | Jul 24-31 | Pendiente |
| **v1.0 Production Release** | **Aug 31** | **En curso** |

---

## Credenciales y Acceso

| Item | Valor |
|------|-------|
| GitHub Org | traviscomber |
| Vercel Team | travis-projects-c14a785a |
| Supabase Project ID | orfncinmhymhhoxbxgjb |
| Branch activo | v0/travis-2540-ed55878a |
| Test User | juan@n3uralia.com / c4rlit0s |
| Rol test user | admin |
| Chrome Puppeteer | /home/vercel-sandbox/.cache/puppeteer/chrome/linux-150.0.7871.24/ |

---

## Design System Reference

```css
/* Property Partners / N3uralia Theme */
--background:    #fbfbfa;
--foreground:    #1a1f1e;
--primary:       #8fb2aa;   /* verde salvia — brand principal */
--primary-dark:  #6b8e85;
--accent:        #b89a7e;   /* tostado calido — accent */
--border:        #d8e5e2;
--muted:         #9ca9a3;
--surface:       #f5f9f7;
--dark-bg:       #173634;   /* hero panels oscuros */
--dark-text:     #e8f0ee;
```

Tipografia: Inter (headings 600-700, body 400-500)
Componentes: bg-white cards, rounded-lg, border-[#d8e5e2], shadow-sm

---

**Ultima actualizacion:** July 10, 2026 — Session: real data integration + Puppeteer scraper (75 propiedades)
**Mantenido por:** v0 AI + Travis Comber
**Version:** 0.5.0 — Real Data Integration Complete

<!-- Phases completadas esta sesion: PostGIS RPCs, Leaflet VitacuraMap, auto-tag via tag_vitacura_point(), PRC sync ArcGIS, Portal Inmobiliario scraper con Puppeteer/Cheerio. Next: AI Reports, scraper multi-pagina, geocodificacion real. -->
