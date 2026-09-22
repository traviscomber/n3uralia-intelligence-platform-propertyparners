# Checklist de regresión funcional — Property Partners Vitacura

Documento vivo con las verificaciones funcionales que deben pasar **antes de mergear cualquier PR** y antes de dar por cerrado un UAT.

- **Origen:** auditoría completa del sitio 2026-09-21 (PR #221, merge `e89e25f`).
- **Alcance:** flujo público (landing + cotizador), autenticación, módulos del dashboard, asistente IA, APIs públicas (incluido rate limiting).
- **Entorno:** preview de Vercel del PR (no producción, para no tocar datos reales).
- **Tipo de prueba:** solo lectura. **No ejecutar escrituras** (asignar propiedades, generar/enviar informes, crear valorizaciones) salvo que el caso lo exija explícitamente — ensucian datos antes de UAT.
- **Sesión:** usuario con rol `admin` (acceso administrado internamente; pedir credenciales al equipo, nunca versionarlas).

> **Criterio de aprobación:** las 19 verificaciones en verde, con datos coherentes (no necesariamente idénticos — los datos operativos cambian mes a mes). Las observaciones cosméticas conocidas están listadas al final y no bloquean.

---

## Parte A — Flujo público (sin sesión)

| # | Verificación | Pasos | Resultado esperado |
|---|--------------|-------|--------------------|
| 1 | Guard de autenticación | Abrir `/dashboard` sin sesión | Redirect a `/auth/login` |
| 2 | Landing + cobertura del cotizador | Cargar `/` y el GET `GET /api/public/valuation-estimate` | 200, `scope: "Vitacura"`, lista de sectores (barrios KML canónicos), `usableMarketSample` > 0 |
| 3 | Estimación pública | POST `/api/public/valuation-estimate` con `{"neighborhood":"<sector válido>","propertyType":"Casa","builtAreaM2":200}` | 200 con `estimate` (rango UF + mediana UF/m²), `disclaimer` presente. Referencia auditada: Jardín del Este 200 m² → 9.690–12.850 UF (sep-2026) |
| 4 | CTA comercial | Revisar la tarjeta de resultado | Disclaimer "no constituye tasación" + CTA "Solicitar valorización profesional" |
| 5 | Validación de entrada | POST con `builtAreaM2: 10` / sector inexistente / `propertyType: "Departamento"` | 400 en cada caso, mensajes claros en español |

## Parte B — Autenticación

| # | Verificación | Pasos | Resultado esperado |
|---|--------------|-------|--------------------|
| 6 | Login inválido | Enviar credenciales incorrectas | Permanece en `/auth/login` con alerta de error **en español** ("Credenciales inválidas…" desde Semana 2, PR #224); **sin redirect** |
| 7 | Login válido | Iniciar sesión con usuario admin | Redirect al home del rol según `defaultDashboardForRole` (`lib/access-control.ts`): ceo→`/dashboard/ceo`, director/subdirector→`/dashboard/director`, seller→`/dashboard/partner`, admin→`/dashboard` |
| 8 | Sidebar completo | Revisar navegación | Hoy, Mercado, Valorizaciones, Propiedades, Informes + grupo ADMINISTRACIÓN (Gestión, Metas y alertas, Datos y metodología, Asignaciones, Usuarios y configuración) |
| 9 | Logout | Botón "Salir" | Redirect a `/auth/login`, sesión cerrada |
| 10 | 404 autenticada | Abrir ruta inexistente con sesión | Página 404 con marca Property Partners en español (desde Semana 2, PR #224), sin filtrar datos |

## Parte C — Módulos del dashboard (con sesión admin)

| # | Verificación | Pasos | Resultado esperado |
|---|--------------|-------|--------------------|
| 11 | **Hoy** (`/dashboard`) | Revisar tarjetas | Período operativo verificado explícito ("ÚLTIMO PERÍODO OPERATIVO VERIFICADO"), meta con cierre real (referencia sep-2026: 11/8 · 137,5%), contadores por revisar/atención, alertas territoriales y de leads |
| 12 | **Mercado** (`/dashboard/market`) | Revisar panel | Fecha de corte visible, oferta activa en casas, **sin** publicar ventas/absorción sin fuente registral (colas de atención honestas) |
| 13 | **Valorizaciones** (`/dashboard/valuations`) | Revisar pipeline | Pipeline V1 con estados (borrador/revisión), "siguiente acción" identificable |
| 14 | **Informes operación** (`/dashboard/reportes/operacion`) | Revisar panel | CEO Intelligence como borrador (no envía automático), informe contractual separado, Delivery Control con resend configurado, ejecuciones con trazabilidad en hora Chile |
| 15 | **Informes canónicos** (`/dashboard/reportes/canonicos`) | Revisar panel | Último informe entregable con período, estado, botones Abrir/Descargar PDF, historial, "Estado de datos" |
| 16 | **Propiedades / Asignaciones** (`/dashboard/properties/admin`) | Revisar cartera | Propiedades candidatas con m², ejecutivas asignadas por sucursal con rol, "Nota auditada" presente |
| 17 | **Gestión** (`/dashboard/control/admin` y `/dashboard/control/operations`) | Revisar paneles | Período vigente, cobertura de metas, metas por entidad, cierre mensual con cargas/filas/reportes, disclosures honestos cuando no hay datos |
| 18 | **Datos y metodología** (`/dashboard/market/fuentes`) | Revisar panel | Trazabilidad de fuentes/ejecuciones/raw; si la consulta falla, estado de error elegante (no maquillado). Ceros = estado real de la consulta, no bug de UI |
| 19 | **Centro de control** (`/dashboard/settings`) | Revisar panel | Perfil, resumen del sistema (versión, zona horaria America/Santiago, idioma), directorio de personas |
| 20 | **Asistente IA** (Pedro Pablo, chat flotante) | Preguntar por desempeño de un período | Respuesta con métricas por corredor, sección EVIDENCIA citando archivo canónico, badge de confianza y "control humano" |

## Parte D — Rate limiting de APIs públicas (pieza crítica de seguridad)

| # | Verificación | Pasos | Resultado esperado |
|---|--------------|-------|--------------------|
| 21 | Disparo del límite | 35 POST seguidos a `/api/public/valuation-estimate` desde la misma IP | Los primeros 30 pasan (según validez), del 31 en adelante **429** con header `Retry-After` y mensaje en español |
| 22 | Recuperación | Esperar ~60 s y repetir 1 POST válido | Vuelve a 200 con estimación válida |
| 23 | Flujo normal no afectado | Uso humano del cotizador (2–5 requests) | Sin 429 |

> Configuración: `PUBLIC_RATE_LIMIT_MAX_PER_MINUTE` (default 30). En UAT con tráfico de pruebas intensivo se puede subir (p. ej. 600) **sin tocar código**. `PUBLIC_RATE_LIMIT_DISABLED=true` solo en ambientes de prueba, nunca en producción.

---

## Trampas conocidas del entorno de prueba (no son bugs de la app)

1. **"CARGANDO" que no termina en navegador headless/panel oculto:** React revela el contenido stream vía `requestAnimationFrame`; en un tab congelado el fallback de Suspense queda visible aunque el contenido ya llegó. Verificar el HTML crudo o probar en un navegador visible antes de declarar un bug.
2. **401 al pegarle con `curl` a un preview de Vercel:** los previews están detrás de Vercel SSO; las peticiones deben salir del navegador (con cookie de sesión) o usar el token de bypass. La ausencia de 429 en un burst vía `curl` **no** significa que el rate limit no funcione.
3. **Acentos por `curl`/Git Bash:** enviar `Jardín del Este` mal codificado produce 400 "Selecciona un sector válido". Usar UTF-8 correcto (`requests` en Python, fetch desde el navegador) o un sector sin acentos.
4. **GET de cobertura va detrás de caché CDN** (`s-maxage=300`): un burst de GETs puede no tocar el origen; para probar el rate limit usar POST (`Cache-Control: no-store`).

## Observaciones cosméticas — estado (Semana 2, PR #224)

- ✅ **Error de login en inglés** — resuelto: mensajes de Supabase localizados al español (`app/auth/login/page.tsx`).
- ✅ **404 genérica sin marca** — resuelto: `app/not-found.tsx` con identidad Property Partners, en español, con enlaces a inicio y login.
- ✅ **Redirect post-login por rol** — confirmado **intencional**: `defaultDashboardForRole` (`lib/access-control.ts`). Nota de datos: la cuenta de pruebas aterriza en `/dashboard/ceo`, lo que sugiere `profile.role='ceo'` mientras la UI muestra "admin"; alinear la etiqueta mostrada con el rol canónico queda como tarea de datos, no de código.
- ✅ **`market/fuentes` en ceros** — verificado: la UI maneja el estado honestamente; los ceros reflejan el estado real de la consulta (`getMarketSourceTrace`), no un defecto de presentación. Sin cambio de código.
- ⏸ **Migración `xlsx`→`exceljs`** — diferida con justificación: `xlsx` se usa en 10 archivos de rutas operativas core (export/import de mercado, casos y borradores de valorización). La API de `exceljs` difiere completamente y el build de CI no valida equivalencia funcional; requiere ambiente ejecutable para validación real, como registra `docs/SECURITY_EXCEPTIONS.md`. Se retoma post-UAT con ambiente disponible.

---

*Última actualización: 2026-09-21, Semana 2 de auditoría (PR #224 en curso) sobre la base del PR #221. Mantener al día con cada cambio funcional relevante.*
