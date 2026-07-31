# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:14 CLT

## Objetivo

Completar estrictamente el alcance contratado para Property Partners mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única del proyecto. Después de cada bloque se deben actualizar avance, evidencias, riesgos y siguiente trabajo; realizar commit en `main`; verificar build, TypeScript, deployment `READY` y errores críticos de runtime.

## Estado general

**Avance contractual estimado: 70%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Activo | 55% |
| 3 | Director y subdirector | Avanzado parcialmente | 70% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | Parcial | 50% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 35% |

## Estado de producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama productiva: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Migración RLS: `expose_authenticated_management_scope_ids`
- Último commit funcional de alcance: `e8b361dc39a10f1da0389af11cd975b3f1b07c07`

---

# Bloque 1 — Perfiles, capacidades y alcance central

**Estado: completado — 100%**

## Completado

- [x] Roles canónicos: `ceo`, `admin`, `director`, `subdirector`, `seller`.
- [x] Matriz contractual de capacidades en `lib/access-control.ts`.
- [x] Alcances `global`, `office` y `self`.
- [x] `getUserScope()` con sesión, perfil, oficina, equipo y entidades visibles.
- [x] Guards reutilizables para páginas y APIs.
- [x] Protección servidor de rutas CEO, dirección, ejecutiva y administración.
- [x] Sidebar filtrado mediante capacidades.
- [x] Post-login dirigido mediante `defaultDashboardForRole()`.
- [x] Workflow de valorización limitado por capacidad, propiedad y oficina.
- [x] Pruebas unitarias de capacidades y navegación.
- [x] Matriz RLS autenticada con `SET LOCAL ROLE authenticated`.
- [x] Corrección de diferencia entre lectura directa de perfiles y política `profiles_select_own_safe`.
- [x] RPC `current_user_visible_profile_ids()` con alcance autorizado.
- [x] RPC `current_user_visible_entity_ids()` con alcance autorizado.
- [x] Ejecución restringida exclusivamente al rol `authenticated`.
- [x] Script reproducible de validación RLS agregado.

## Evidencias

- `lib/access-control.ts`
- `lib/user-scope.ts`
- `lib/access-guards.ts`
- `components/layout/sidebar.tsx`
- `app/auth/login/page.tsx`
- `app/api/valuations/[id]/workflow/route.ts`
- `scripts/test-access-control.mjs`
- `scripts/test-authenticated-scope.sql`
- Migración: `expose_authenticated_management_scope_ids`
- Commit RPC en aplicación: `1687e4f3e172ed2dd870d90dd24895991612be33`
- Commit matriz SQL reproducible: `e8b361dc39a10f1da0389af11cd975b3f1b07c07`

## Resultado de matriz autenticada

| Perfil probado | Perfiles visibles | Entidades visibles | Valorizaciones visibles |
|---|---:|---:|---:|
| CEO | 6 | 6 | 1 |
| Director QA Lo Beltrán | 2 | 2 | 1 |
| Ejecutiva Lo Beltrán | 1 | 1 | 1 |
| Ejecutiva Nueva Costanera | 1 | 1 | 0 |
| Ejecutiva Santa María | 1 | 1 | 0 |

La prueba se ejecutó con el rol PostgreSQL `authenticated`, JWT simulado por usuario y RLS activa. No se utilizó `service_role` como evidencia.

## Criterio de cierre cumplido

CEO conserva alcance global; dirección queda limitada a su oficina; ejecutiva queda limitada a sí misma y a sus asignaciones; navegación, páginas, APIs y RLS consumen una definición coherente de alcance.

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: activo — 55%**

## Disponible

- [x] Resumen y métricas personales.
- [x] Cartera asignada.
- [x] Creación de valorizaciones.
- [x] Comparables, revisión y reporte personal.

## Pendiente principal

- [ ] Aplicar `getUserScope()` en todas las consultas personales.
- [ ] Conectar propiedad asignada con nueva valorización.
- [ ] Mostrar historial y observaciones de revisión.
- [ ] Conectar tareas y alertas personales.
- [ ] Consolidar metas, MoM, YoY, seguimiento y conversión.
- [ ] QA con una ejecutiva por oficina.

---

# Bloque 3 — Director y subdirector

**Estado: avanzado parcialmente — 70%**

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [ ] Aplicar alcance central en todas las consultas y APIs.
- [ ] Conectar valorizaciones, alertas, tareas y metas con responsables.
- [ ] Pruebas negativas entre oficinas y QA autenticado.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: avanzado — 94%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, alertas, decisiones, presentación, reporte y metodología.
- [ ] Alertas y decisiones conectadas a caso, responsable e historial.
- [ ] Confirmar reglas oficiales de ranking y umbrales.
- [ ] QA visual autenticado y PDF en navegador real.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal de módulos

**Estado: parcial — 50%**

- [ ] Mercado → comparable.
- [ ] Propiedad → asignación → valorización.
- [ ] Valorización → revisión → expediente.
- [ ] Alerta → tarea → seguimiento.
- [ ] Resultados → reporte con fuente, período y metodología.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 35%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento base por oficina y ejecutiva validado.
- [ ] Login y ruta inicial en navegador para todos los perfiles QA.
- [ ] Lecturas y escrituras autorizadas/bloqueadas por flujo.
- [ ] Valorización, asignación, tareas, alertas y reportes.
- [ ] Responsive, accesibilidad, build, logs y PDF.

# Riesgos activos

1. El flujo completo de ejecutiva todavía contiene consultas locales que deben migrarse a `getUserScope()`.
2. Captaciones brutas no tiene fuente separada.
3. Umbrales y ranking requieren validación de negocio.
4. No existe automatización de navegador autenticado en este entorno.

# Salvaguardas

- No modificar cuentas reales sin instrucción explícita.
- No inventar datos, roles, oficinas o métricas.
- No presentar proxies como datos canónicos.
- No usar `service_role` como evidencia de RLS.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Bloque 2 — Flujo completo de ejecutiva — Próximo trabajo 1 · 2 · 3

1. Auditar y migrar todas las consultas del perfil ejecutiva a `getUserScope()` y capacidades personales.
2. Conectar propiedad asignada → nueva valorización, conservando propiedad, ejecutiva y evidencia de origen.
3. Integrar historial, observaciones, tareas y alertas personales; probar con una ejecutiva por oficina y actualizar este roadmap.
