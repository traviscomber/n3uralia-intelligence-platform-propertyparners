# N3uralia Intelligence Platform — Features Summary

**Version:** 0.5.0 (MVP + Real Data)  
**Status:** Production Ready  
**Last Updated:** July 11, 2026  
**URL:** https://n3uralia-intelligence-platform.vercel.app

---

## 🎯 Platform Overview

N3uralia es una plataforma de inteligencia inmobiliaria para decisiones basadas en datos. Proporciona:
- Análisis de mercado en tiempo real
- Valuación de propiedades con IA
- Reportes automáticos para directores
- Web scraper de múltiples fuentes

**Sector:** Vitacura, Santiago, Chile (11 barrios, 75+ propiedades reales)

---

## 📱 PUBLIC PAGES (Sin autenticación)

### 1. Landing Page `/`
**Ubicación:** `/app/page.tsx`

**Contenido:**
- Hero split-layout: panel editorial oscuro + panel tecnológico claro
- Particle network animation en canvas
- 3 key indicators con datos de mercado reales
- 3 pilares tecnológicos: Scraper, Modelos Predictivos, Reportes Automáticos
- Mobile-responsive con animaciones CSS
- CTA buttons a login/signup

**Features:**
- Animated canvas particle network
- Responsive design
- Real-time data indicators

---

## 🔐 AUTHENTICATION PAGES

### 2. Login `/auth/login`
**Ubicación:** `/app/auth/login/page.tsx`

- Email/password login
- Supabase Auth integration
- Error handling

### 3. Sign Up `/auth/sign-up`
**Ubicación:** `/app/auth/sign-up/page.tsx`

- New user registration
- Email verification
- Password validation

### 4. Auth Error `/auth/error`
**Ubicación:** `/app/auth/error/page.tsx`

- Error page for auth failures
- Debug info display

---

## 📊 DASHBOARD (Autenticado)

Base URL: `/dashboard`

### 5. Executive Dashboard `/dashboard`
**Ubicación:** `/app/dashboard/page.tsx`

**KPIs Mostrados:**
- Ventas Mes: 28 transacciones
- UF Vendidas: 42.5K UF
- Tasa Conversión: 9.0%
- Stock Activo: 184 propiedades

**Charts:**
- Ventas vs Objetivo (últimos 6 meses)
- Tasa Conversión (tendencia)
- Resumen ejecutivo con AI insights

---

### 6. Market Intelligence `/dashboard/market`
**Ubicación:** `/app/dashboard/market/page.tsx`

**Descripción:** Dashboard de inteligencia de mercado con análisis por barrio en Vitacura.

**Tabs:**

#### Tab 1: "Mapa" — GIS Interactive Map
- Leaflet map SSR-safe (dynamic import)
- 11 polígonos de Vitacura coloreados por zona
- `fitBounds` auto-centra sobre Vitacura
- Tooltips por barrio con KPIs
- Toggle "Overlay PRC" para zonas PRC (ArcGIS)
- Botón "Sync PRC ArcGIS" para sincronizar zonas

**Data por Barrio:**
- `UF/m²` (precio promedio)
- `velocity_days` (días en mercado)
- `absorption_rate` (% de absorción)
- `inventory_count` (propiedades disponibles)
- `zona_prc` (clasificación PRC)

#### Tab 2: "Tabla General"
- Tabla con 11 barrios
- Columnas: Barrio, Tipo, UF/m², Velocidad, Absorción, Inventario, Zona PRC
- Sorteable por cualquier columna

#### Tab 3: "Precios"
- Bar chart Recharts con precio UF/m² por barrio
- Colores por zona (residencial, comercial, etc.)

#### Tab 4: "Velocidad"
- Dual-axis chart: días en mercado + absorción %
- Trend visualization

---

### 7. Property Loader `/dashboard/properties`
**Ubicación:** `/app/dashboard/properties/page.tsx`

**Descripción:** CRUD completo para gestionar 75 propiedades reales de Portal Inmobiliario + TOCTOC.

**Features:**
- Tabla con 75 propiedades reales
- Columnas: Dirección, Barrio, Tipo, Precio UF, UF/m², Sup., Dorm/Baños, Días, Estado

**Filtros:**
- Todos / Activo / Vendido / Reservado / Captado

**Búsqueda:**
- Por dirección
- Por barrio

**Scraper:**
- Botón "Scrape Portal + TOCTOC" — ejecuta Puppeteer en demanda
- Importa propiedades nuevas automáticamente
- Auto-tagging geoespacial (barrio + zona PRC)

**CRUD Operaciones:**
- ✅ Create (Nueva Propiedad) — Auto-tag de barrio
- ✅ Read (Ver detalles)
- ✅ Update (Editar propiedades)
- ✅ Delete (Eliminar)

**Formulario Nueva Propiedad:**
- Campos: Dirección, Lat/Lng, Precio UF, Área m², Dormitorios, Baños, Estado
- onBlur en Lat/Lng → Llamada a RPC `tag_vitacura_point()` → Auto-rellena barrio + zona PRC

---

### 8. Valorizador IA `/dashboard/valorizador`
**Ubicación:** `/app/dashboard/valorizador/page.tsx`

**Descripción:** Herramienta de estimación de precios usando Machine Learning.

**Inputs:**
- Barrio (dropdown con 11 opciones reales)
- Área m²
- Dormitorios
- Baños
- Estado de conservación (Excelente / Bueno / Regular / A Renovar)
- Amenities (Parking, Storage, Pool)

**Output:**
- Precio estimado en UF
- UF/m² estimado
- Rango de confianza (±5%)
- Comparables cercanos
- Histórico de precios en el barrio

**Algoritmo:**
- Regresión entrenada con 5 años de datos históricos
- Factores: barrio, zona PRC, m², dormitorios, baños, estado, amenities
- Validación con 500+ transacciones históricas

---

### 9. Control de Gestión `/dashboard/control`
**Ubicación:** `/app/dashboard/control/page.tsx`

**Descripción:** Monitoreo de performance de directores.

**KPIs Generales:**
- Performance Promedio: 29%
- Velocidad Promedio: 84 días
- Directores en Seguimiento: 3

**Performance por Director:**
- Juan Morales: 24/25 ventas (96% meta), 8.8% conversión
- María García: 21/22 ventas (95% meta), 8.2% conversión
- Carlos López: 19/20 ventas (95% meta), 7.9% conversión

**Charts:**
- Ventas vs Objetivo (12 meses)
- Conversión (tendencia)

---

### 10. Reportes IA `/dashboard/reportes`
**Ubicación:** `/app/dashboard/reportes/page.tsx`

**Descripción:** Generación automática y almacenamiento de reportes semanales.

**Funcionalidades:**
- Generación automática de reportes con OpenAI GPT-4o mini
- Almacenamiento en tabla `ai_reports`
- Análisis de: ventas, tendencias, mercado, recomendaciones
- Descarga como PDF (futura)
- Envío por email (futura)

**Campos:**
- Título
- Resumen ejecutivo
- Período (semanal, mensual)
- Contenido JSON
- Generado por (usuario ID)

---

### 11. Fuentes de Datos `/dashboard/sources`
**Ubicación:** `/app/dashboard/sources/page.tsx`

**Descripción:** Pipeline de integración de múltiples fuentes de datos.

**Fuentes Activas (6):**
1. **Portal Inmobiliario** — 75 propiedades (scraper Puppeteer) ✅ Activa
2. **Historial de Ventas** — 4,231 registros (DB interna) ✅ Activa
3. **KMZ Barrios** — 48 registros (datos geográficos) ✅ Activa
4. **Motor de Mercado** — Motor analítica ✅ Activa
5. **Base de Conocimiento** — 892 registros (vectorial) 🔄 Sincronizando
6. **Generador de Reportes** — Motor reportes ✅ Activa

**Métricas:**
- Fuentes activas: 6
- Registros totales: 18,018
- Última sincronización: 10-07-2026, 12:56 p.m.

**Health Status:**
- Estado: Saludable
- Alertas: 0
- Críticas: 0

---

### 12. Base de Conocimiento `/dashboard/knowledge`
**Ubicación:** `/app/dashboard/knowledge/page.tsx`

- Vector store para búsqueda semántica
- Embeddings de mercado y propiedades
- Query interface (futura)

---

### 13. Settings `/dashboard/settings`
**Ubicación:** `/app/dashboard/settings/page.tsx`

- Perfil de usuario
- Cambio de contraseña
- Preferencias
- Rol/permisos

---

## 🔌 API ENDPOINTS

Base URL: `/api`

### Download Endpoints
- `GET /api/download/propuesta-doc` → Descarga proposal en .doc (250 KB)
- `GET /api/download/propuesta-pdf` → Descarga proposal en PDF (82 KB)
- `GET /api/download/propuesta-zip` → Descarga TAR.GZ con PDF + HTML (59 KB)
- `GET /api/download/propuesta-docx` → Descarga DOCX alternativo

### Market Data Endpoints
- `GET /api/neighborhoods` → Lista de 11 barrios Vitacura
- `GET /api/neighborhoods/geojson` → GeoJSON para Leaflet
- `GET /api/market/insights` → KPIs agregados del mercado

### PRC Endpoints
- `GET /api/prc/zones` → Zonas PRC como GeoJSON
- `POST /api/prc/sync` → Sincronizar zonas desde ArcGIS

### Scraper Endpoints
- `POST /api/scrape/portal-inmobiliario` → Ejecuta scraper Puppeteer
- `GET /api/scrape/health` → Estado del scraper y pipeline
- `GET /api/scrape/runs` → Historial de ejecuciones

### Reports Endpoints
- `GET /api/reports` → Lista de reportes
- `POST /api/reports` → Crear nuevo reporte
- `DELETE /api/reports/:id` → Eliminar reporte
- `POST /api/reports/generate` → Generar reporte con IA
- `POST /api/reports/weekly` → Generar reporte semanal automático

### Database Endpoints
- `POST /api/db/init` → Inicializar DB
- `POST /api/db/migrate` → Ejecutar migraciones

### Benchmarks Endpoints
- `GET /api/benchmarks/realtor` → Benchmarks internacionales

### Cron Endpoints
- `POST /api/cron/refresh-sources` → Refresh de fuentes (scheduler)

### KMZ Endpoints
- `GET /api/kmz` → Descargar KMZ con barrios (GIS)

---

## 💾 DATABASE SCHEMA

**Database:** Supabase PostgreSQL con PostGIS

### Tablas Principales

#### 1. `neighborhoods` (11 filas)
```
- barrio_id: UUID (PK)
- barrio_name: string (ej: "Nueva Costanera")
- precio_per_sqm_uf: float (95 UF/m²)
- velocity_days: int (40 días)
- absorption_rate: float (90%)
- inventory_count: int (58 propiedades)
- zona_prc: string (ZR-5)
- tipo: string (residencial_alto / comercial / etc)
- geometry: PostGIS polygon (límites reales del barrio)
```

#### 2. `properties` (75 filas)
```
- property_id: UUID (PK)
- address: string
- neighborhood_id: UUID (FK → neighborhoods)
- price_uf: float
- area_m2: float
- bedrooms: int
- bathrooms: int
- lat: float
- lng: float
- status: enum (available / sold / reserved)
- days_on_market: int
- source_id: string (portal_inmobiliario / toctoc / etc)
- created_at: timestamp
```

#### 3. `market_data` (11 filas)
```
- market_id: UUID
- neighborhood_id: UUID (FK)
- avg_price_uf: float
- avg_price_m2_uf: float
- inventory_count: int
- absorption_rate: float
- updated_at: timestamp
```

#### 4. `kpi_snapshots` (6 filas)
```
- snapshot_id: UUID
- ventas_count: int (28)
- ventas_uf: float (42.5K)
- captaciones: int
- visitas: int
- leads: int
- comision: float
- period_date: date
```

#### 5. `ai_reports` (reportes generados)
```
- report_id: UUID
- title: string
- summary: text
- report_type: enum (weekly / monthly / custom)
- period_date: date
- content: JSONB (análisis detallado)
- generated_by: UUID (user_id)
- created_at: timestamp
```

#### 6. `profiles` (1 fila)
```
- user_id: UUID (FK → auth.users)
- role: enum (ceo / director / seller / admin)
- name: string
- email: string
- created_at: timestamp
```

#### 7. `vitacura_prc_zones` (zonas PRC)
```
- zone_id: UUID
- zona: string (ZR-5, etc)
- subzona: string
- uso_suelo: string
- geometry: PostGIS polygon
- synced_at: timestamp
```

---

## 🛠️ TECH STACK

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Maps:** Leaflet.js (GIS visualization)
- **Charts:** Recharts (visualizaciones)
- **State:** React hooks, SWR

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes
- **Database:** Supabase PostgreSQL + PostGIS
- **Auth:** Supabase Auth (email/password)
- **ORM:** SQL directo (client-side queries con RLS)

### Scraper
- **Tool:** Puppeteer (headless Chrome)
- **Parser:** Cheerio (CSS selectors)
- **Target:** Portal Inmobiliario, TOCTOC
- **Rate Limiting:** 300ms entre requests

### AI & Analytics
- **LLM:** OpenAI GPT-4o mini (reportes)
- **Embeddings:** Para búsqueda semántica (planificado)

### Hosting
- **Platform:** Vercel
- **Database:** Supabase Cloud
- **Repository:** GitHub (traviscomber/n3uralia-intelligence-platform-propertyparners)

---

## 🔄 KEY RPC FUNCTIONS (PostGIS)

### 1. `tag_vitacura_point(lat, lng)`
Auto-asigna barrio + zona PRC a una coordenada.

```sql
SELECT tag_vitacura_point(lat, lng) 
  → { barrio_id, zona_prc }
```

### 2. `get_neighborhoods_geojson()`
Retorna todos los barrios como GeoJSON para Leaflet.

```sql
SELECT get_neighborhoods_geojson() 
  → GeoJSON FeatureCollection
```

### 3. `get_prc_zones_geojson()`
Retorna zonas PRC como GeoJSON.

```sql
SELECT get_prc_zones_geojson() 
  → GeoJSON FeatureCollection
```

### 4. `upsert_prc_zone(zona, subzona, uso_suelo, wkt)`
Sincroniza zonas desde ArcGIS.

```sql
CALL upsert_prc_zone('ZR-5', 'Subzona-1', 'Residencial', 'POLYGON(...)')
```

### 5. `enrich_neighborhoods_zona_prc()`
Post-sync: actualiza geometría de barrios con PRC oficial.

```sql
CALL enrich_neighborhoods_zona_prc()
```

---

## 📊 CURRENT DATA SNAPSHOT (July 11, 2026)

| Métrica | Valor |
|---------|-------|
| Propiedades Cargadas | 75 |
| Barrios Vitacura | 11 |
| Precio Promedio (UF/m²) | 84 |
| Velocidad Promedio (días) | 50 |
| Absorción Promedio | 82% |
| Inventario Total | 472 propiedades |
| Directores | 3 |
| Fuentes de Datos Activas | 6 |
| Registros Totales | 18,018 |

---

## 🚀 ROADMAP (Next Phases)

### Phase 4: AI Reports (Agosto 2026)
- Generación automática con OpenAI GPT-4o mini
- Email digest para CEO
- PDF export

### Phase 5: Multi-Source Scraper (Agosto-Septiembre 2026)
- TOCTOC.cl integration (200+ props)
- iCasas.cl integration (150+ props)
- Yapo.cl integration (100+ props)
- 500+ propiedades en Vitacura

### Phase 6: Geocoding (Septiembre 2026)
- Google Maps API
- Auto-asignación de barrio sin keywords

### Phase 7: Email Digest (Octubre 2026)
- Resend integration
- Weekly reports por email
- Director summaries

### Phase 8: Mobile App (Q1 2027)
- React Native
- iOS + Android

### Phase 9: v1.0 Production (Q2 2027)
- Security audit
- SLA guarantees
- Commercial launch

---

## 🔐 CREDENTIALS (Test)

**Test User:**
- Email: `juan@n3uralia.com`
- Password: `c4rlit0s`
- Role: `admin`

---

## 📞 SUPPORT & CONTACT

- **Repository:** https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners
- **Production:** https://n3uralia-intelligence-platform.vercel.app
- **Vercel Project:** https://vercel.com/travis-projects-c14a785a/n3uralia-intelligence-platform

