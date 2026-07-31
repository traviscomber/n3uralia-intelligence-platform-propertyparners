# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:40 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 80%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 92% |
| 3 | Director y subdirector | En cierre | 88% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | En ejecución | 72% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 50% |

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

**Estado: cierre funcional — 92%**

- [x] Métricas personales con metas, YoY, fuente y período.
- [x] Propiedad asignada → valorización trazable.
- [x] Tareas personales, historial y observaciones.
- [x] QA reversible en las tres oficinas.
- [ ] QA visual autenticado, edición posterior a devolución y responsive.

---

# Bloque 3 — Director y subdirector

**Estado: en cierre — 88%**

## Completado

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [x] API de tareas migrada a `requireAnyCapability()` y `UserScope`.
- [x] Lecturas de tareas limitadas a alcance global, oficina o personal.
- [x] Creación, comentario, reasignación y cambio de estado validados contra perfiles visibles.
- [x] Rechazo explícito de tareas fuera de la oficina autorizada.
- [x] Workspace de dirección con cola de valorizaciones, responsables y tareas abiertas.
- [x] Cola de valorizaciones limitada a `visibleProfileIds`.
- [x] Prueba autenticada de dirección Lo Beltrán con cero valorizaciones ajenas visibles.
- [x] Script reproducible `scripts/test-director-office-scope.sql`.

## Evidencias

- `app/api/management/tasks/route.ts`
- `components/management/director-operational-workspace.tsx`
- `app/dashboard/director/page.tsx`
- `scripts/test-director-office-scope.sql`
- Commit API de tareas: `196a310885bbc952d8405ef513c4edd91f893cde`
- Commit workspace: `d81c0fb886830146c76e1c46df6a0db400e38700`
- Commit integración dashboard: `ced1de2f4a1a0519dad1c4dc1ed53edbf434a705`
- Commit prueba SQL: `9c6215bf4b9033f2490b17df9d65924e30a9b21a`

## Resultado QA autenticado

- Director QA Lo Beltrán: 1 valorización visible dentro de su alcance.
- Valorizaciones fuera del alcance: 0.
- Tareas de otras oficinas visibles: 0.
- La base no contiene actualmente una cuenta QA `subdirector`; por eso no se afirma una prueba autenticada de ese rol.

## Diferencia autorizada director/subdirector

La matriz contractual actual entrega a ambos perfiles el mismo alcance de oficina y las mismas capacidades operativas. No se implementará una diferencia artificial mientras contrato o negocio no definan una delegación específica. La distinción queda registrada por rol, pero no amplía ni reduce permisos sin una regla documentada.

## Pendiente para cierre total

- [ ] Crear una cuenta QA de subdirector sólo con autorización explícita o reutilizar una identidad formalmente designada.
- [ ] QA visual autenticado de revisión, comentarios y reasignación.
- [ ] Validar devolución de valorización, corrección y reenvío completo.

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

**Estado: en ejecución — 72%**

- [ ] Mercado → comparable.
- [x] Propiedad → asignación → valorización.
- [x] Valorización → historial y expediente.
- [x] Alerta → tarea asignada → seguimiento de oficina.
- [x] Resultados personales → lectura con fuente y metodología.
- [ ] Revisión → corrección editable → reenvío.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 50%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas y valorizaciones propias.
- [x] Prueba negativa de dirección entre oficinas.
- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Escrituras autorizadas y bloqueadas por flujo completo.
- [ ] Responsive, accesibilidad, logs, reportes y PDF.

# Riesgos activos

1. No existe una cuenta QA de subdirector para prueba autenticada independiente.
2. Falta validar en navegador autenticado los ciclos visuales completos.
3. Captaciones brutas no tiene fuente separada.
4. Umbrales y ranking requieren validación de negocio.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No inventar diferencias de permisos no documentadas.
- No usar `service_role` como evidencia de RLS.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Cierre del Bloque 3 — Próximo trabajo 1 · 2 · 3

1. Completar devolución de valorización, corrección editable y reenvío desde ejecutiva hacia dirección.
2. Conectar cada decisión de revisión con tarea, responsable, comentario e historial del expediente.
3. Ejecutar QA autenticado integral del ciclo dirección–ejecutiva y cerrar el Bloque 3 al 100%.
