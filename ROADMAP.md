# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:09 CLT

## Objetivo

Completar estrictamente el alcance contratado para Property Partners mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única del proyecto. Después de cada bloque se deben actualizar avance, evidencias, riesgos y siguiente trabajo; realizar commit en `main`; verificar build, TypeScript, deployment `READY` y errores críticos de runtime.

## Estado general

**Avance contractual estimado: 68%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Validación final | 95% |
| 2 | Flujo completo de ejecutiva | Parcialmente implementado | 55% |
| 3 | Director y subdirector | Avanzado parcialmente | 70% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | Parcial | 50% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 30% |

## Estado de producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama productiva: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Último commit funcional: `7c15196931aa5b97ebb738711ebdcb73f30e53f1`
- Último deployment funcional: `dpl_6EVvoHF9JP7JQSRhWEzbVhzfhw4r` — validación final en curso.

---

# Bloque 1 — Perfiles, capacidades y alcance central

**Estado: validación final — 95%**

## Completado

- [x] Roles canónicos: `ceo`, `admin`, `director`, `subdirector`, `seller`.
- [x] Matriz contractual de capacidades en `lib/access-control.ts`.
- [x] Alcances `global`, `office` y `self`.
- [x] `getUserScope()` con sesión, perfil, oficina, equipo y entidades visibles.
- [x] Guards reutilizables para páginas y APIs.
- [x] Protección servidor de rutas CEO, dirección, ejecutiva y administración.
- [x] Sidebar filtrado mediante `hasCapability()`; eliminadas bifurcaciones locales por categorías de rol.
- [x] Post-login dirigido mediante `defaultDashboardForRole()`.
- [x] Cuenta sin perfil válido rechazada y cerrada de forma segura.
- [x] Workflow de valorización protegido por capacidades y `visibleProfileIds`.
- [x] Transiciones de valorización limitadas por propiedad, oficina y capacidad.
- [x] Prueba de regresión de capacidades, navegación y post-login agregada.

## Evidencias nuevas

- `components/layout/sidebar.tsx`
- `app/auth/login/page.tsx`
- `app/api/valuations/[id]/workflow/route.ts`
- `scripts/test-access-control.mjs`
- Commit post-login: `388eb06201260304bea20f91892b2b38532a0ef5`
- Commit sidebar: `8c3bd31bb407e99fd579fc8dd0647aacd53a3d2a`
- Commit API workflow: `fbeecaf8dbec74ab570bf42fa087757a2811821a`
- Commit pruebas: `7c15196931aa5b97ebb738711ebdcb73f30e53f1`

## Pendiente para cierre total

- [ ] Ejecutar pruebas autenticadas negativas entre oficinas con JWT real.
- [ ] Confirmar correspondencia final entre `visibleProfileIds` y RLS para todas las tablas críticas.
- [ ] Registrar deployment final en `READY` y revisar runtime logs.

## Criterio de cierre

CEO conserva alcance global; dirección queda limitada a su oficina; ejecutiva queda limitada a sí misma y a sus asignaciones; navegación, páginas y APIs consumen la misma matriz; las pruebas negativas y RLS pasan con roles autenticados.

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: parcialmente implementado — 55%**

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

**Estado: en desarrollo — 30%**

- [ ] Login y ruta inicial por todos los perfiles QA.
- [ ] Navegación visible y accesos denegados.
- [ ] Aislamiento por oficina y ejecutiva.
- [ ] Lecturas y escrituras autorizadas/bloqueadas.
- [ ] Valorización, asignación, tareas, alertas y reportes.
- [ ] Responsive, accesibilidad, build, logs y RLS.

# Riesgos activos

1. Falta completar pruebas negativas autenticadas contra RLS en todas las tablas críticas.
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

## Validación final del Bloque 1 — Próximo trabajo 1 · 2 · 3

1. Ejecutar matriz RLS autenticada para CEO, director y ejecutivas de las tres oficinas.
2. Corregir cualquier diferencia entre capacidades de aplicación y políticas de base de datos.
3. Verificar deployment/runtime, cerrar Bloque 1 al 100% y comenzar el flujo completo de ejecutiva.
