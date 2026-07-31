# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:34 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 77%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 92% |
| 3 | Director y subdirector | Avanzado parcialmente | 70% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | En ejecución | 68% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 46% |

## Producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Migraciones recientes:
  - `expose_authenticated_management_scope_ids`
  - `align_valuation_decision_log_creation_fields`

---

# Bloque 1 — Perfiles, capacidades y alcance central

**Estado: completado — 100%**

- [x] Matriz única de capacidades.
- [x] Alcances `global`, `office` y `self`.
- [x] `getUserScope()` y guards reutilizables.
- [x] Sidebar y post-login controlados por capacidades.
- [x] Rutas y workflow de valorización protegidos en servidor.
- [x] RPC de perfiles y entidades visibles limitada a `authenticated`.
- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: cierre funcional — 92%**

## Completado

- [x] Resumen y métricas personales.
- [x] Cartera asignada bajo RLS.
- [x] Creación, registro y expediente de valorizaciones.
- [x] Consultas personales resueltas desde el perfil autenticado.
- [x] Propiedad asignada → valorización prellenada.
- [x] Verificación API de asignación activa y pertenencia.
- [x] Evidencia de propiedad y asignación persistida en el expediente.
- [x] Historial y observaciones desde `valuation_decision_log`.
- [x] Lectura personal única de cierres, UF, metas, cumplimiento, YoY, seguimiento y conversión.
- [x] Fuente, lámina y período visibles en la lectura personal.
- [x] API para iniciar y completar tareas asignadas al perfil autenticado.
- [x] Nota de resolución obligatoria al completar una tarea.
- [x] Estados de tareas alineados con el esquema real: `open`, `in_progress`, `done`, `dismissed`.
- [x] Matriz QA reversible para Lo Beltrán, Nueva Costanera y Santa María.
- [x] QA ejecutado con rol PostgreSQL `authenticated`, JWT por ejecutiva y `ROLLBACK`.

## Evidencias nuevas

- `components/management/partner-performance-summary.tsx`
- `components/management/partner-task-action.tsx`
- `components/management/partner-operational-workspace.tsx`
- `app/api/management/tasks/[id]/route.ts`
- `scripts/test-partner-reversible-qa.sql`
- Commit lectura personal: `d727923655f78c3fe0eac15e87081bb7a6b08bd0`
- Commit integración en dashboard: `81b52e022d0c624f2f42bf84ca945507e9eee52d`
- Commit API de tareas: `49c86292a6e1b15424f6a8c649143ce260eb6b8c`
- Commit acciones UI: `a17db4f5bf58b36df663418b10a29c4ec2a08a53`
- Commits de alineación de estados: `a7c414403100f823a9540ac8ed5118a29fc2f0ba`, `d6f421b67fb098c31c331a2ddce908e770b7af1c`
- Commit matriz QA reversible: `2c899b679ab2061adca62a18324ddd839bc0aff6`

## Resultado QA reversible

| Ejecutiva | Tareas propias | Valorizaciones propias | Tareas ajenas | Valorizaciones ajenas |
|---|---:|---:|---:|---:|
| Lo Beltrán | 1 | 1 | 0 | 0 |
| Nueva Costanera | 1 | 1 | 0 | 0 |
| Santa María | 1 | 1 | 0 | 0 |

Todos los registros de prueba se ejecutaron dentro de transacciones terminadas con `ROLLBACK`. No quedaron tareas ni valorizaciones ficticias persistidas.

## Pendiente para cierre total

- [ ] Verificar visualmente el flujo autenticado en navegador real.
- [ ] Confirmar edición completa de ficha y comparables después de una devolución a borrador.
- [ ] Validar estados vacíos, errores recuperables y responsive.

---

# Bloque 3 — Director y subdirector

**Estado: avanzado parcialmente — 70%**

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [ ] Aplicar alcance central a todas las consultas y APIs restantes.
- [ ] Conectar revisión de valorizaciones, alertas, tareas y metas con responsables.
- [ ] Pruebas negativas entre oficinas y QA autenticado.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: avanzado — 94%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, alertas, decisiones, presentación, reporte y metodología.
- [ ] Conectar alertas y decisiones con caso, responsable e historial.
- [ ] Confirmar reglas oficiales de ranking y umbrales.
- [ ] QA visual autenticado y PDF en navegador real.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: en ejecución — 68%**

- [ ] Mercado → comparable.
- [x] Propiedad → asignación → valorización.
- [x] Valorización → historial y expediente.
- [x] Tarea asignada → inicio → resolución.
- [ ] Revisión → corrección editable → reenvío.
- [ ] Alerta → tarea → seguimiento completo.
- [x] Resultados personales → lectura con fuente, período y metodología.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 46%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas y valorizaciones propias.
- [x] Confirmación de cero visibilidad cruzada en registros QA.
- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Escrituras autorizadas y bloqueadas por flujo completo.
- [ ] Responsive, accesibilidad, logs, reportes y PDF.

# Riesgos activos

1. Falta validar en navegador autenticado el ciclo visual completo de ejecutiva.
2. La corrección editable de una valorización devuelta debe verificarse y completarse si la UI actual no cubre todos los campos.
3. Captaciones brutas no tiene fuente separada.
4. Umbrales y ranking requieren validación de negocio.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No inventar métricas ni presentar proxies como datos canónicos.
- No usar `service_role` como evidencia de RLS.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Bloque 3 — Director y subdirector — Próximo trabajo 1 · 2 · 3

1. Migrar consultas y APIs restantes de dirección al alcance central por oficina.
2. Conectar revisión de valorizaciones, tareas, alertas y responsables dentro del dashboard de dirección.
3. Ejecutar pruebas negativas entre oficinas y documentar las diferencias autorizadas entre director y subdirector.
