# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:44 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 82%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 94% |
| 3 | Director y subdirector | Cierre funcional | 96% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | En ejecución | 78% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 52% |

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
- [x] Corrección de ficha restringida al propietario mientras el expediente está en borrador.
- [x] Registro `draft_corrected` en historial.
- [x] QA reversible en las tres oficinas.
- [ ] QA visual autenticado, estados vacíos y responsive.

---

# Bloque 3 — Director y subdirector

**Estado: cierre funcional — 96%**

## Completado

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [x] API de tareas migrada a alcance central.
- [x] Workspace con cola de valorizaciones, responsables y tareas.
- [x] Aislamiento autenticado entre oficinas.
- [x] Dirección puede devolver una valorización con motivo obligatorio.
- [x] La devolución crea o reabre una tarea de corrección asignada a la ejecutiva responsable.
- [x] La tarea conserva caso, responsable, oficina, motivo y vencimiento.
- [x] La ejecutiva puede corregir la ficha únicamente en estado `draft`.
- [x] El reenvío cierra la tarea de corrección y registra `resubmitted_after_correction`.
- [x] La aprobación cierra cualquier tarea de devolución aún abierta.
- [x] Historial versionado conserva actor, estado anterior, estado nuevo y motivo.

## Evidencias nuevas

- `app/api/valuations/[id]/draft/route.ts`
- `app/api/valuations/[id]/workflow/route.ts`
- `scripts/test-valuation-return-cycle.sql`
- Commit corrección de borrador: `0a99182a0878674b3985b76094694961e2bc039d`
- Commit decisiones conectadas a tareas: `5a27d483cdb74a3d308d152c47915f53d75b568a`
- Commit QA reproducible: `6064eb6939fa954ddd69fa9bb937ac16d192f29d`

## QA

- El aislamiento de dirección Lo Beltrán frente a otras oficinas permanece validado.
- La consulta de control ejecutada al cierre no encontró datos operativos visibles adicionales para recorrer el ciclo real sin persistir fixtures.
- El script reproducible documenta el ciclo completo y exige IDs QA conocidos; no se presentan resultados simulados como prueba ejecutada.
- No existe una cuenta QA `subdirector`; director y subdirector conservan la misma matriz contractual mientras no exista una regla distinta documentada.

## Pendiente para cierre total

- [ ] Ejecutar el ciclo completo con una valorización QA preparada y reversible.
- [ ] QA visual autenticado de devolución, edición y reenvío.
- [ ] Crear cuenta QA subdirector sólo con autorización explícita.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: avanzado — 94%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, alertas, decisiones, presentación, reporte y metodología.
- [ ] Conectar alertas y decisiones con caso, responsable e historial.
- [ ] Confirmar reglas oficiales de ranking y umbrales.
- [ ] QA visual autenticado y PDF.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: en ejecución — 78%**

- [ ] Mercado → comparable.
- [x] Propiedad → asignación → valorización.
- [x] Valorización → historial y expediente.
- [x] Alerta → tarea asignada → seguimiento de oficina.
- [x] Revisión → devolución → tarea → corrección → reenvío.
- [x] Resultados personales → lectura con fuente y metodología.
- [ ] Integrar decisión CEO con caso y responsable.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 52%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas y valorizaciones propias.
- [x] Prueba negativa de dirección entre oficinas.
- [ ] Ciclo integral dirección–ejecutiva con fixtures QA reversibles.
- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive, accesibilidad, logs, reportes y PDF.

# Riesgos activos

1. No existe una cuenta QA de subdirector para prueba autenticada independiente.
2. Falta una valorización QA reversible preparada para ejecutar el ciclo completo sin tocar datos reales.
3. Falta validar en navegador autenticado los ciclos visuales completos.
4. Captaciones brutas no tiene fuente separada.
5. Umbrales y ranking requieren validación de negocio.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No inventar diferencias de permisos no documentadas.
- No usar `service_role` como evidencia de RLS.
- No afirmar QA ejecutado cuando sólo existe un guion reproducible.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Bloque 4 — CEO y consolidación ejecutiva — Próximo trabajo 1 · 2 · 3

1. Conectar alertas y decisiones CEO con oficina, ejecutiva, tarea, valorización e historial.
2. Unificar el centro de decisiones con responsables, vencimientos, estado y evidencia de origen.
3. Ejecutar QA de navegación global → oficina → caso, revisar runtime y actualizar este roadmap.
