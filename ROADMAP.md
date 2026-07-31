# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 22:35 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 98%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 98% |
| 3 | Director y subdirector | Cierre funcional | 99% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 99% |
| 5 | Integración transversal de módulos | Cierre funcional | 99% |
| 6 | QA contractual, seguridad y aceptación | En cierre | 97% |

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
- [x] Mercado, configuración y administración de propiedades conectados a capacidades centrales.
- [x] `team` y `role` excluidos del endpoint de edición personal para impedir alteraciones del alcance.

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: cierre funcional — 98%**

- [x] Métricas personales con metas, MoM, YoY, fuente y período.
- [x] Propiedad asignada → valorización trazable.
- [x] Tareas personales, historial, observaciones y correcciones.
- [x] Mercado → comparable → expediente.
- [x] Navegación expediente ↔ reporte imprimible.
- [x] Estados vacíos y errores recuperables.
- [x] Perfil personal limitado a nombre y avatar HTTPS; equipo y rol permanecen administrativos.
- [ ] QA visual autenticado y revisión responsive real.

---

# Bloque 3 — Director y subdirector

**Estado: cierre funcional — 99%**

- [x] Dashboard, equipo, fichas, tareas e historial.
- [x] Alcance de oficina y aislamiento autenticado.
- [x] Devolución → tarea → corrección → reenvío.
- [x] Administración de asignaciones limitada a perfiles visibles por oficina.
- [x] Cada escritura de asignación vuelve a validar el perfil afectado.
- [x] Matriz autenticada de asignaciones: dirección Lo Beltrán puede asignar a su oficina y RLS bloquea Nueva Costanera.
- [ ] Recorrido visual autenticado.
- [ ] Cuenta QA subdirector sólo con autorización explícita.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: cierre funcional — 99%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Centro de decisiones conectado con oficina, ejecutiva, caso, tarea e historial.
- [x] Navegación CEO → oficina → expediente → reporte.
- [ ] Confirmar reglas oficiales de ranking y umbrales derivados.
- [ ] QA visual autenticado y validación de PDF.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: cierre funcional — 99%**

- [x] Mercado → publicación → comparable candidato.
- [x] Evidencia de origen, fecha, precio, identidad y metodología.
- [x] Propiedad → asignación → valorización.
- [x] Alerta → tarea → seguimiento.
- [x] Revisión → devolución → corrección → reenvío.
- [x] Decisión CEO → oficina → responsable → caso → reporte.
- [x] Propiedad operativa no confirmada separada de identidad canónica.
- [ ] QA visual del selector, expediente y reporte.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en cierre — 97%**

## Completado

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas, valorizaciones y comparables.
- [x] Pruebas negativas de acceso cruzado.
- [x] Matriz de aceptación y checklist contractual.
- [x] Reporte imprimible con evidencia y decisiones.
- [x] Guía ejecutable de QA visual autenticado.
- [x] Regresiones estáticas de acceso central, reporte y administración.
- [x] Paquete consolidado de entrega contractual.
- [x] Asignación propia de oficina ejecutada bajo rol `authenticated` y revertida con `ROLLBACK`.
- [x] Asignación cruzada Lo Beltrán → Nueva Costanera bloqueada por RLS con error `42501`.
- [x] API de destinatarios protegida por `settings.manage`.
- [x] Validación HTTPS para webhooks y avatares.
- [x] Endpoint personal bloquea cambios de `team` y `role` con respuesta `403`.
- [x] Regresión estática para impedir reapertura de edición personal del alcance.
- [x] Suite Puppeteer preparada para capturas autenticadas en escritorio, tableta y móvil.
- [x] Automatización preparada para señales de accesibilidad, navegación por teclado, PDF y manifiesto JSON.
- [x] Credenciales excluidas del repositorio y requeridas únicamente como secretos de entorno.

## Evidencias nuevas

- `scripts/run-authenticated-visual-qa.mjs`
- `docs/AUTOMATED_VISUAL_QA_RUNBOOK.md`
- comando `pnpm qa:visual`
- Commit suite visual: `56f7a3a56ec73722c6f26b674a4252d22245ebcc`
- Commit comando de ejecución: `ba6037fc9d8654342711a3ab89287aff71b470da`
- Commit preservación de dependencias: `fcf1020979b0b1a9eaefff45a3ca1ae6cc2152da`
- Commit runbook: `7131d53e04dd10ff603763179d01d38a430207ae`

## Pendiente

- [ ] Ejecutar la suite con secretos QA fuera del repositorio.
- [ ] Revisar manualmente las capturas y los PDF generados.
- [ ] Navegación completa con lector de pantalla real.
- [ ] Contraste contextual medido.
- [ ] Ciclo integral visual dirección–ejecutiva.

# Pendientes separados por naturaleza

## Técnicos

- Confirmar build, `READY`, alias productivo y runtime del commit acumulado de la suite visual.
- Ejecutar `pnpm qa:visual` en un entorno con Chromium y secretos QA.

## Visuales

- Revisar `artifacts/visual-qa/manifest.json`, capturas y PDF.
- Completar `docs/VISUAL_QA_EXECUTION_LOG.md` únicamente con evidencia observada.
- Ejecutar lector de pantalla y medición contextual de contraste.

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
- No afirmar QA visual antes de revisar evidencia generada.
- No versionar contraseñas, cookies, sesiones, capturas sensibles ni artefactos QA.

# Bloque activo

## Ejecución y revisión visual — Próximo trabajo 1 · 2 · 3

1. Confirmar build, `READY`, alias y runtime de la suite automatizada.
2. Ejecutar la suite con secretos QA en un entorno compatible y revisar capturas, overflow, foco y PDF.
3. Corregir incidencias observadas y completar el registro final, manteniendo separados los pendientes de negocio.
