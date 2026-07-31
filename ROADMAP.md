# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 22:22 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 96%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 97% |
| 3 | Director y subdirector | Cierre funcional | 98% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 99% |
| 5 | Integración transversal de módulos | Cierre funcional | 99% |
| 6 | QA contractual, seguridad y aceptación | En cierre | 93% |

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

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: cierre funcional — 97%**

- [x] Métricas personales con metas, MoM, YoY, fuente y período.
- [x] Propiedad asignada → valorización trazable.
- [x] Tareas personales, historial, observaciones y correcciones.
- [x] Mercado → comparable → expediente.
- [x] Navegación expediente ↔ reporte imprimible.
- [x] Estados vacíos y errores recuperables.
- [ ] QA visual autenticado y revisión responsive real.

---

# Bloque 3 — Director y subdirector

**Estado: cierre funcional — 98%**

- [x] Dashboard, equipo, fichas, tareas e historial.
- [x] Alcance de oficina y aislamiento autenticado.
- [x] Devolución → tarea → corrección → reenvío.
- [x] Administración de asignaciones limitada a perfiles visibles por oficina.
- [x] Cada escritura de asignación vuelve a validar el perfil afectado.
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

**Estado: en cierre — 93%**

## Completado

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas, valorizaciones y comparables.
- [x] Pruebas negativas de acceso cruzado.
- [x] Matriz de aceptación y checklist contractual.
- [x] Reporte imprimible con evidencia y decisiones.
- [x] Guía ejecutable de QA visual autenticado.
- [x] Regresiones estáticas de acceso central y reporte.
- [x] Paquete consolidado de entrega contractual.
- [x] Administración de propiedades migrada desde roles locales a capacidades `properties.*.assign`.
- [x] Creación y actualización de asignaciones limitadas mediante `visibleProfileIds` y `assertProfileVisible()`.
- [x] Configuración alineada con la capacidad específica `settings.manage`.
- [x] Estados administrativos de error y vacío con semántica accesible.
- [x] Registro final de ejecución visual preparado sin declarar pruebas no ejecutadas.

## Evidencias nuevas

- `app/dashboard/properties/admin/page.tsx`
- `app/dashboard/settings/layout.tsx`
- `scripts/test-administrative-access-regression.mjs`
- `docs/VISUAL_QA_EXECUTION_LOG.md`
- Commit administración de propiedades: `2b48c283c877c776476b6852b937e1bed4bd8f76`
- Commit configuración: `c25c357c2b99c9f826590c61daf630b031f8695b`
- Commit regresión administrativa: `363ee145ae0b28108b2d44b29dabe5b012bcdf9d`
- Commit registro QA visual: `eaf2463f73d78689d3c1afbeb2567d72e3aab5d6`

## Pendiente

- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive móvil/tableta validado en navegador.
- [ ] Navegación completa por teclado y lector de pantalla.
- [ ] Contraste medido.
- [ ] PDF revisado con sesión autenticada.
- [ ] Ciclo integral visual dirección–ejecutiva.

# Pendientes separados por naturaleza

## Técnicos

- Confirmar build, `READY`, alias productivo y runtime del último commit acumulado.
- Ejecutar regresiones estáticas en CI o entorno local cuando esté disponible.
- Auditar ingestión sólo cuando exista una superficie de escritura identificada en el repositorio; no se encontró una ruta administrativa activa durante esta revisión.

## Visuales

- Ejecutar `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md`.
- Registrar resultados en `docs/VISUAL_QA_EXECUTION_LOG.md`.
- Validar móvil, tableta, escritorio, teclado, lector de pantalla y PDF.

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

## Cierre técnico y ejecución visual — Próximo trabajo 1 · 2 · 3

1. Confirmar build, `READY`, alias productivo y runtime del último commit acumulado.
2. Ejecutar una última matriz negativa autenticada sobre asignaciones de propiedades entre oficinas.
3. Iniciar el registro visual por perfil usando la guía y el log preparados, manteniendo separados los pendientes de negocio.
