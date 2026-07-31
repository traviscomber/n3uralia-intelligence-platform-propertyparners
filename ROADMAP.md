# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 22:05 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 90%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 94% |
| 3 | Director y subdirector | Cierre funcional | 96% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 98% |
| 5 | Integración transversal de módulos | Cierre funcional | 96% |
| 6 | QA contractual, seguridad y aceptación | En cierre | 72% |

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

**Estado: cierre funcional — 94%**

- [x] Métricas personales con metas, YoY, fuente y período.
- [x] Propiedad asignada → valorización trazable.
- [x] Tareas personales, historial y observaciones.
- [x] Corrección de ficha restringida al propietario en borrador.
- [x] Registro `draft_corrected` en historial.
- [x] QA reversible en las tres oficinas.
- [ ] QA visual autenticado, estados vacíos y responsive.

---

# Bloque 3 — Director y subdirector

**Estado: cierre funcional — 96%**

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [x] API de tareas migrada a alcance central.
- [x] Workspace con cola de valorizaciones, responsables y tareas.
- [x] Aislamiento autenticado entre oficinas.
- [x] Devolución → tarea → corrección → reenvío e historial versionado.
- [ ] Recorrido visual autenticado y cuenta QA subdirector sólo con autorización explícita.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: cierre funcional — 98%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, presentación, reporte y metodología.
- [x] Centro de decisiones conectado con oficina, ejecutiva, caso, tarea e historial.
- [x] Navegación CEO → oficina → expediente.
- [ ] Confirmar reglas oficiales de ranking y umbrales derivados.
- [ ] QA visual autenticado y validación de PDF.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: cierre funcional — 96%**

- [x] Mercado → publicación persistida → comparable candidato.
- [x] Selector de valorizaciones en borrador limitado por alcance.
- [x] Evidencia de publicación, propiedad operativa, fecha observada y precio.
- [x] Duplicados bloqueados por expediente y publicación.
- [x] Registro `market_comparable_linked`.
- [x] Propiedad → asignación → valorización.
- [x] Alerta → tarea → seguimiento.
- [x] Revisión → devolución → corrección → reenvío.
- [x] Decisión CEO → oficina → responsable → caso.
- [x] Corrección de identidad: una propiedad operativa no confirmada no se escribe como propiedad canónica.
- [ ] Incorporar evidencia de origen en el reporte imprimible de valorización.
- [ ] QA visual del selector y expediente.

## Evidencias recientes

- Commit corrección de identidad canónica: `595eb8728618bc6c5369d62ed3bbc2296ba8ccb5`
- Commit script QA corregido: `a8c1a272194cd4701c8090f41c1a4240963fb2ef`
- QA reversible ejecutado: `inserted_count = 1`, seguido de `ROLLBACK`.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en cierre — 72%**

## Completado

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas y valorizaciones propias.
- [x] Prueba negativa de dirección entre oficinas.
- [x] Rutas operativas conectadas desde CEO hasta expediente.
- [x] Fixture conocido para mercado → comparable → valorización.
- [x] Ejecución real del vínculo como ejecutiva autenticada dentro de transacción reversible.
- [x] Detección y corrección de incompatibilidad entre propiedad operativa y propiedad canónica.
- [x] Matriz documental de aceptación en `docs/QA_ACCEPTANCE_MATRIX.md`.
- [x] Deployment funcional `READY` y revisión de runtime sin errores ni eventos fatales.

## Pendiente

- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive móvil/tableta y estados vacíos.
- [ ] Navegación por teclado, foco y lector de pantalla.
- [ ] Reportes y PDF en navegador autenticado.
- [ ] Ciclo integral visual dirección–ejecutiva.

# Riesgos activos

1. No existe navegador autenticado disponible para cerrar QA visual y PDF.
2. No existe cuenta QA de subdirector para prueba independiente.
3. Captaciones brutas no tiene fuente separada.
4. Umbrales y ranking requieren validación de negocio.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No presentar publicaciones como ventas confirmadas.
- No confundir propiedad operativa con identidad canónica confirmada.
- No inventar diferencias de permisos no documentadas.
- No usar `service_role` como evidencia de RLS.
- No afirmar QA visual cuando sólo se validaron código, rutas o datos.

# Bloque activo

## Cierre de QA contractual — Próximo trabajo 1 · 2 · 3

1. Incorporar evidencia de comparables y decisiones en el reporte imprimible de valorización.
2. Auditar y corregir estados vacíos, errores recuperables, responsive y accesibilidad mediante revisión de código y build.
3. Preparar checklist de aceptación final por requisito contractual y separar claramente pendientes que requieren navegador autenticado o definición de negocio.
