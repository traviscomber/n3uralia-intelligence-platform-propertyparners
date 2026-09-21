# Excepciones de seguridad — Property Partners Intelligence Platform

Registro de decisiones de seguridad conscientes, con su justificación y plan de
salida. Toda excepción debe tener owner, fecha de revisión y condición de cierre.

---

## 1. `xlsx@0.18.5` (SheetJS) con CVEs públicos sin fix en npm

- **Fecha de decisión:** 2026-09-21 (auditoría completa del sitio)
- **CVEs conocidos:** CVE-2023-30533 (prototype pollution), CVE-2024-22363 (ReDoS)
- **Por qué se mantiene:** SheetJS no publica versiones con fix en npm (el
  fix 0.20.x solo se distribuye vía su CDN propio). Migrar a `exceljs` toca
  7 archivos (exportación e importación CBRS/mercado) y requiere validación
  funcional de los pipelines de datos que no fue posible ejecutar en la
  auditoría (disco de desarrollo lleno).
- **Archivos afectados:** `app/api/market/export/route.ts`,
  `app/api/valorizador/export/route.ts`, `app/dashboard/market/import-cbrs/page.tsx`,
  `app/dashboard/market/import-cbrs-canonical/page.tsx`, `lib/market-import.ts`
  (+ sus rutas de API asociadas).
- **Mitigaciones actuales:** los archivos XLSX procesados provienen de fuentes
  internas/cargadas por usuarios autenticados con capacidad `market.manage_sources`;
  no hay parsing de archivos anónimos.
- **Condición de cierre:** migrar a `exceljs` (API async, mantenida) o a un
  parser enWorker/edge aislado, con test de regresión de los archivos canónicos
  de importación. Owner: N3uralia.

---

## 2. Rate limiting en memoria en la API pública de valorización

- **Fecha de decisión:** 2026-09-21
- **Qué se hizo:** `lib/public-rate-limit.ts` — ventana fija de 30 solicitudes
  /minuto/IP para `GET` y `POST /api/public/valuation-estimate`, sin
  dependencias externas.
- **Limitación aceptada:** el contador es por instancia de servidor. En Vercel
  serverless con N instancias activas, el límite efectivo es ~30×N/min/IP.
  Se acepta porque la amenaza principal (abuse de costo contra el service
  role) queda acotada por instancia y el tráfico legítimo es humano y bajo.
- **Condición de cierre:** si el valorizador público crece en tráfico o
  sufra ataques, migrar a Upstash Ratelimit (límite global por IP + token
  opcional). Owner: N3uralia.
