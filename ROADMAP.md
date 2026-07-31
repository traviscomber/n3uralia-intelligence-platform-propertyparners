# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:19 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 73%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | En ejecución | 78% |
| 3 | Director y subdirector | Avanzado parcialmente | 70% |
| 4 | CEO y consolidación ejecutiva | Avanzado | 94% |
| 5 | Integración transversal de módulos | En ejecución | 62% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 38% |

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

Evidencias principales: `lib/access-control.ts`, `lib/user-scope.ts`, `lib/access-guards.ts`, `scripts/test-access-control.mjs`, `scripts/test-authenticated-scope.sql`.

---

# Bloque 2 — Flujo completo de ejecutiva

**Estado: en ejecución — 78%**

## Completado

- [x] Resumen y métricas personales.
- [x] Cartera asignada bajo RLS.
- [x] Creación, registro y expediente de valorizaciones.
- [x] Espacio operativo personal integrado en el dashboard de ejecutiva.
- [x] Consultas personales resueltas desde `requirePageCapability()` y el perfil autenticado.
- [x] Propiedades asignadas visibles en el dashboard personal.
- [x] Inicio de valorización desde una propiedad asignada.
- [x] Prellenado de dirección, tipología, superficies, dormitorios, baños y estacionamientos.
- [x] Verificación API de asignación activa y pertenencia al perfil autenticado.
- [x] Persistencia de `propertyAssignmentId`, `sourcePropertyId`, rol y fecha de asignación como evidencia.
- [x] Valorizaciones personales con estado y versión.
- [x] Tareas y alertas personales.
- [x] Observaciones e historial de revisión desde `valuation_decision_log`.
- [x] Alineación del esquema de creación del log de decisiones.

## Evidencias nuevas

- `components/management/partner-operational-workspace.tsx`
- `app/dashboard/partner/page.tsx`
- `app/dashboard/valuation/page.tsx`
- `app/api/valuation/cases/route.ts`
- Commit espacio personal: `d1a745447313c5894b5be0d761ad8405d603977b`
- Commit conexión dashboard: `8bbd378a707915d2617efc2538235f144e0898a7`
- Commit trazabilidad API: `c04ee8d2fcbde814dd0dceddfe5377e0f7a50e21`
- Commit prellenado: `3ab61eecd5749854acf90ab22790dd55740b505f`
- Commit corrección de esquema de propiedades: `446b84bba3832a13fc58d83d6b5800bd38707f86`

## Pendiente para cierre

- [ ] Consolidar metas, MoM, YoY, seguimiento y conversión en una lectura personal única.
- [ ] Permitir actualización de estado de tareas personales cuando corresponda.
- [ ] Probar escritura completa propiedad → valorización → revisión con una cuenta QA que tenga asignación activa.
- [ ] Ejecutar QA autenticado con una ejecutiva por oficina.
- [ ] Validar estados vacíos y mensajes de recuperación en navegador real.

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

**Estado: en ejecución — 62%**

- [ ] Mercado → comparable.
- [x] Propiedad → asignación → valorización.
- [x] Valorización → historial y expediente.
- [ ] Revisión → decisión completa.
- [x] Tareas y alertas visibles por audiencia.
- [ ] Alerta → tarea → seguimiento completo.
- [ ] Resultados → reporte con fuente, período y metodología.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 38%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento base por oficina y ejecutiva.
- [x] Builds intermedios aprobados para el nuevo flujo personal.
- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Escrituras autorizadas y bloqueadas por flujo.
- [ ] Valorización completa desde asignación activa.
- [ ] Responsive, accesibilidad, logs, reportes y PDF.

# Riesgos activos

1. Las cuentas QA actuales no tienen asignaciones activas suficientes para probar el nuevo flujo de escritura de extremo a extremo sin crear datos controlados.
2. Captaciones brutas no tiene fuente separada.
3. Umbrales y ranking requieren validación de negocio.
4. No existe automatización de navegador autenticado en este entorno.

# Salvaguardas

- No modificar cuentas reales ni crear datos operativos falsos sin necesidad documentada.
- No inventar métricas ni presentar proxies como datos canónicos.
- No usar `service_role` como evidencia de RLS.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Cierre del Bloque 2 — Próximo trabajo 1 · 2 · 3

1. Consolidar metas, MoM, YoY, seguimiento y conversión en el dashboard personal con procedencia y períodos visibles.
2. Completar acciones personales de tareas y el ciclo revisión → corrección → reenvío de valorización.
3. Crear datos QA controlados y reversibles para una ejecutiva por oficina, ejecutar el flujo completo y actualizar este roadmap.
