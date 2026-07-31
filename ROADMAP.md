# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 22:16 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 94%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 97% |
| 3 | Director y subdirector | Cierre funcional | 97% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 99% |
| 5 | Integración transversal de módulos | Cierre funcional | 99% |
| 6 | QA contractual, seguridad y aceptación | En cierre | 86% |

## Producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`

---

# Bloque 1 — Perfiles, capacidades y alcance central

**Estado: completado — 100%**

- [x] Matriz única de capacidades.
- [x] Alcances `global`, `office` y `self`.
- [x] `getUserScope()` y guards reutilizables.
- [x] Sidebar, post-login, rutas y APIs críticas protegidas.
- [x] Matriz RLS autenticada.

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: cierre funcional — 97%**

- [x] Métricas personales con metas, MoM, YoY, fuente y período.
- [x] Propiedad asignada → valorización trazable.
- [x] Tareas personales, historial, observaciones y correcciones.
- [x] Mercado → comparable → expediente.
- [x] Navegación directa expediente ↔ reporte imprimible.
- [x] Estados vacíos y errores recuperables incorporados.
- [ ] QA visual autenticado y revisión responsive real.

---

# Bloque 3 — Director y subdirector

**Estado: cierre funcional — 97%**

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Alcance de oficina y aislamiento autenticado.
- [x] Devolución → tarea → corrección → reenvío.
- [x] Acceso directo desde la cola de oficina al expediente y al reporte.
- [x] Objetivos táctiles, foco visible y error semántico en la cola operativa.
- [ ] Recorrido visual autenticado.
- [ ] Cuenta QA subdirector sólo con autorización explícita.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: cierre funcional — 99%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Centro de decisiones conectado con oficina, ejecutiva, caso, tarea e historial.
- [x] Navegación CEO → oficina → expediente → reporte.
- [x] Acceso directo al reporte imprimible desde cada caso.
- [x] Estados de carga/error accesibles y acciones con foco visible.
- [ ] Confirmar reglas oficiales de ranking y umbrales derivados.
- [ ] QA visual autenticado y validación de PDF.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: cierre funcional — 99%**

- [x] Mercado → publicación persistida → comparable candidato.
- [x] Evidencia de origen, fecha, precio, identidad y metodología.
- [x] Propiedad → asignación → valorización.
- [x] Alerta → tarea → seguimiento.
- [x] Revisión → devolución → corrección → reenvío.
- [x] Decisión CEO → oficina → responsable → caso → reporte.
- [x] Propiedad operativa no confirmada separada de identidad canónica.
- [x] Evidencia, ajustes y decisiones incorporados al reporte imprimible.
- [ ] QA visual del selector, expediente y reporte.

## Evidencias recientes

- `app/dashboard/valuations/[id]/layout.tsx`
- `components/management/director-operational-workspace.tsx`
- `components/management/ceo-decisions.tsx`
- `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md`
- `scripts/test-valuation-report-access.mjs`
- Commit navegación del expediente: `9a33573de69f368239eb1eaac0ad6125326623dd`
- Commit acceso desde dirección: `c99c052f2f08f2c8cf466804aa990e13d9f7ff26`
- Commit acceso desde CEO: `9e4c4c100c3174450c73bd463db416437ab698fc`
- Commit guía visual: `1383160eae6dc167f9f1c1b64572036e51e8ddc3`
- Commit regresión estática: `35b847a61ea4a02a8fec71d6004a9c43f82ab5a2`

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en cierre — 86%**

## Completado

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas, valorizaciones y comparables.
- [x] Pruebas negativas de acceso cruzado.
- [x] Matriz de aceptación y checklist contractual.
- [x] Reporte imprimible con evidencia y decisiones.
- [x] Accesos directos desde expediente, dirección y CEO.
- [x] Guía ejecutable por perfil, viewport, teclado, lector de pantalla y PDF.
- [x] Regresión estática para guards, enlaces, foco, estados y semántica.
- [x] Build del último commit completado sin errores.

## Pendiente

- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive móvil/tableta validado en navegador.
- [ ] Navegación completa por teclado y lector de pantalla.
- [ ] Contraste medido.
- [ ] PDF revisado con sesión autenticada.
- [ ] Ciclo integral visual dirección–ejecutiva.

# Pendientes separados por naturaleza

## Técnicos

- Confirmar estado `READY` y runtime del último deployment acumulado.
- Ejecutar el script de regresión en el entorno local o CI cuando esté disponible.

## Visuales

- Ejecutar `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md`.
- Validar móvil, tableta, escritorio, teclado, lector de pantalla y PDF.
- Registrar evidencias e incidencias por caso.

## Negocio

- Definición oficial de ranking.
- Confirmación de umbrales de alertas.
- Designación de cuenta QA subdirector si se requiere prueba separada.
- Fuente explícita para captaciones brutas.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No presentar publicaciones como ventas confirmadas.
- No confundir propiedad operativa con identidad canónica confirmada.
- No inventar diferencias de permisos no documentadas.
- No usar `service_role` como evidencia de RLS.
- No afirmar QA visual cuando sólo se validaron código, rutas o datos.

# Bloque activo

## Cierre técnico final — Próximo trabajo 1 · 2 · 3

1. Confirmar `READY`, alias productivo y runtime del último commit acumulado.
2. Auditar rutas y APIs restantes para encontrar errores técnicos o accesos todavía no conectados a capacidades.
3. Consolidar un paquete de entrega con checklist, evidencias, pendientes de negocio y plan de ejecución del QA visual autenticado.
