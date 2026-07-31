# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:04 CLT

## Objetivo

Completar estrictamente el alcance contratado para Property Partners mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única del proyecto. Después de cada bloque se deben actualizar avance, evidencias, riesgos y siguiente trabajo; realizar commit en `main`; verificar build, TypeScript, deployment `READY` y errores críticos de runtime.

## Límites contractuales

### Incluido

- autenticación, perfiles y control de acceso;
- alcance global, por oficina y personal;
- inteligencia de mercado;
- valorización de propiedades;
- control de gestión comercial;
- dashboards y reportes por audiencia;
- propiedades y asignaciones necesarias;
- metas, evolución, comparaciones, rankings y alertas;
- integración, consistencia y trazabilidad entre módulos.

### Excluido salvo aprobación formal

- CRM general fuera de los flujos contratados;
- facturación;
- mensajería omnicanal;
- automatizaciones externas no documentadas;
- workflows configurables avanzados;
- funcionalidades de Versión 2;
- métricas inventadas o proxies no identificados.

## Estado general

**Avance contractual estimado: 66%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Cierre técnico en curso | 80% |
| 2 | Flujo completo de ejecutiva | Parcialmente implementado | 55% |
| 3 | Director y subdirector | Avanzado parcialmente | 70% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | Parcial | 50% |
| 6 | QA contractual, seguridad y aceptación | Inicial | 25% |

## Estado de producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama productiva: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Último commit funcional del bloque: `d7b0190b97606fe6e86f5e41899e8049343a8324`
- Build acumulado: completado sin errores.

---

# Bloque 1 — Perfiles, capacidades y alcance central

**Objetivo:** asegurar que navegación, páginas, APIs, reportes y operaciones utilicen una única definición de permisos y alcance.

**Estado: cierre técnico en curso — 80%**

## Completado

- [x] Roles canónicos: `ceo`, `admin`, `director`, `subdirector`, `seller`.
- [x] Matriz contractual de capacidades en `lib/access-control.ts`.
- [x] Alcances `global`, `office` y `self`.
- [x] Ruta inicial definida por rol.
- [x] `getUserScope()` centralizado en `lib/user-scope.ts`.
- [x] Resolución de sesión, perfil, rol, equipo, oficina y entidad.
- [x] Resolución de `visibleProfileIds` y `visibleEntityIds` según alcance.
- [x] Guards reutilizables para páginas y APIs en `lib/access-guards.ts`.
- [x] Respuestas API estandarizadas `401`, `403` y `500`.
- [x] Validadores de visibilidad para perfiles y entidades.
- [x] Protección servidor para rutas CEO.
- [x] Protección servidor para rutas director/subdirector.
- [x] Protección servidor para rutas de ejecutiva.
- [x] Protección de configuración y usuarios.
- [x] Protección de asignación de propiedades.
- [x] Protección de administración de metas y gestión.
- [x] Builds intermedios aprobados en Vercel.

## Evidencias

- `lib/access-control.ts`
- `lib/user-scope.ts`
- `lib/access-guards.ts`
- `app/dashboard/ceo/layout.tsx`
- `app/dashboard/director/layout.tsx`
- `app/dashboard/partner/layout.tsx`
- `app/dashboard/settings/layout.tsx`
- `app/dashboard/properties/admin/layout.tsx`
- `app/dashboard/control/admin/layout.tsx`

## Pendiente para cierre total

- [ ] Migrar el sidebar para filtrar cada enlace mediante capacidades, no sólo categorías de rol.
- [ ] Aplicar la ruta inicial por rol en el flujo posterior al login sin eliminar dashboards existentes.
- [ ] Auditar APIs críticas y aplicar `requireCapability()` en cada escritura.
- [ ] Validar correspondencia entre `visibleProfileIds`/`visibleEntityIds` y políticas RLS.
- [ ] Crear pruebas unitarias de la matriz de capacidades.
- [ ] Ejecutar pruebas negativas autenticadas entre roles y oficinas.

## Criterio de cierre

- Todas las superficies consumen la misma matriz.
- Una URL manual no amplía acceso.
- CEO ve alcance global.
- Director y subdirector ven únicamente su oficina.
- Ejecutiva ve únicamente información personal o asignada.
- Build, TypeScript, RLS y pruebas negativas aprobados.

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
- [ ] Propiedad asignada → nueva valorización.
- [ ] Historial y observaciones de revisión.
- [ ] Tareas, alertas, metas, MoM, YoY y conversión.
- [ ] QA con una ejecutiva por oficina.

---

# Bloque 3 — Director y subdirector

**Estado: avanzado parcialmente — 70%**

## Disponible

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.

## Pendiente principal

- [ ] Aplicar alcance central en consultas y APIs.
- [ ] Separar acciones de subdirector cuando corresponda.
- [ ] Valorizaciones, alertas, tareas y metas conectadas con responsables.
- [ ] Pruebas negativas entre oficinas y QA autenticado.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: avanzado — 94%**

## Disponible

- [x] Consolidado, oficinas, metas, MoM, YoY y evolución.
- [x] Rankings, cartera, alertas, decisiones y detalle.
- [x] Presentación, reporte, procedencia y metodología.

## Pendiente principal

- [ ] Aplicar guards a APIs CEO.
- [ ] Alertas y decisiones conectadas a caso, responsable e historial.
- [ ] Confirmar reglas oficiales de ranking y umbrales.
- [ ] QA visual autenticado y PDF en navegador real.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal de módulos

**Estado: parcial — 50%**

## Flujos obligatorios

- [ ] Mercado → comparable.
- [ ] Propiedad → asignación → valorización.
- [ ] Valorización → revisión → expediente.
- [ ] Alerta → tarea → seguimiento.
- [ ] Resultados → reporte con fuente, período y metodología.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: inicial — 25%**

## Matriz mínima

- [ ] CEO.
- [ ] Director Lo Beltrán QA.
- [ ] Ejecutiva Lo Beltrán.
- [ ] Ejecutiva Nueva Costanera.
- [ ] Ejecutiva Santa María.
- [ ] Subdirector QA cuando exista definición autorizada.

## Obligatorio

- [ ] Login y ruta inicial.
- [ ] Navegación visible y acceso denegado.
- [ ] Aislamiento por oficina y ejecutiva.
- [ ] Lecturas y escrituras autorizadas/bloqueadas.
- [ ] Valorización, asignación, tareas, alertas y reportes.
- [ ] Responsive, accesibilidad, build, logs y RLS.
- [ ] Matriz requisito → funcionalidad → evidencia → estado.

---

# Riesgos activos

1. Sidebar y algunas APIs todavía usan reglas locales.
2. La correspondencia completa con RLS debe probarse con rol autenticado.
3. Captaciones brutas no tiene fuente separada.
4. Umbrales y ranking requieren validación de negocio.
5. No existe automatización de navegador autenticado en este entorno.

# Salvaguardas

- No modificar cuentas reales sin instrucción explícita.
- No inventar datos, roles, oficinas o métricas.
- No presentar proxies como datos canónicos.
- No usar `service_role` como evidencia de RLS.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Cierre del Bloque 1 — Próximo trabajo 1 · 2 · 3

1. Conectar el sidebar y el post-login directamente a la matriz central de capacidades.
2. Aplicar guards a las APIs críticas de escritura y validar alcance contra RLS.
3. Crear pruebas unitarias/negativas, verificar producción y cerrar el Bloque 1 al 100%.
