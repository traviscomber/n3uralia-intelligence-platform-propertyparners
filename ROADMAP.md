# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 21:52 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 85%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 94% |
| 3 | Director y subdirector | Cierre funcional | 96% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 98% |
| 5 | Integración transversal de módulos | En ejecución | 84% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 56% |

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

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [x] API de tareas migrada a alcance central.
- [x] Workspace con cola de valorizaciones, responsables y tareas.
- [x] Aislamiento autenticado entre oficinas.
- [x] Dirección puede devolver una valorización con motivo obligatorio.
- [x] La devolución crea o reabre una tarea de corrección asignada.
- [x] La ejecutiva puede corregir y reenviar el expediente.
- [x] El reenvío cierra la tarea y registra historial versionado.
- [ ] Ciclo QA completo con fixture reversible y recorrido visual autenticado.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: cierre funcional — 98%**

## Completado

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, presentación, reporte y metodología.
- [x] Centro de decisiones conectado con valorizaciones abiertas.
- [x] Cada caso identifica oficina, ejecutiva responsable, versión y estado.
- [x] Cada caso muestra la última decisión y su observación.
- [x] Las tareas derivadas se vinculan mediante `source_key` al expediente.
- [x] Responsable, prioridad, vencimiento y estado quedan visibles.
- [x] Navegación CEO → oficina → expediente disponible desde la misma cola.
- [x] API global protegida por capacidades para construir la cola ejecutiva.

## Evidencias nuevas

- `app/api/management/ceo-decisions/route.ts`
- `components/management/ceo-decisions.tsx`
- Commit API de cola conectada: `966476755108c9135a2216b643974b23110269e0`
- Commit centro de decisiones: `4d5b8e59644a0c45d10e4cb9cf06e9667b5d496a`

## Pendiente para cierre total

- [ ] Confirmar reglas oficiales de ranking y umbrales derivados.
- [ ] QA visual autenticado de navegación global → oficina → caso.
- [ ] Validación final de presentación y PDF en navegador real.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: en ejecución — 84%**

- [ ] Mercado → comparable.
- [x] Propiedad → asignación → valorización.
- [x] Valorización → historial y expediente.
- [x] Alerta → tarea asignada → seguimiento de oficina.
- [x] Revisión → devolución → tarea → corrección → reenvío.
- [x] Decisión CEO → oficina → responsable → caso → historial.
- [x] Resultados personales y ejecutivos con fuente y metodología.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 56%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas y valorizaciones propias.
- [x] Prueba negativa de dirección entre oficinas.
- [x] Rutas operativas conectadas desde CEO hasta expediente.
- [ ] Ciclo integral dirección–ejecutiva con fixtures QA reversibles.
- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive, accesibilidad, logs, reportes y PDF.

# Riesgos activos

1. Falta una valorización QA reversible preparada para recorrer visualmente el ciclo completo.
2. No existe una cuenta QA de subdirector para prueba independiente.
3. Falta navegador autenticado para validar recorridos visuales y PDF.
4. Captaciones brutas no tiene fuente separada.
5. Umbrales y ranking requieren validación de negocio.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No inventar diferencias de permisos no documentadas.
- No usar `service_role` como evidencia de RLS.
- No afirmar QA visual cuando sólo se validaron rutas, build o datos.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Bloque 5 — Integración transversal — Próximo trabajo 1 · 2 · 3

1. Conectar una propiedad de mercado seleccionada como comparable trazable dentro de una valorización.
2. Unificar evidencia de mercado, selección, ajustes y decisión en el expediente y reporte.
3. Ejecutar QA reversible del flujo mercado → comparable → valorización y actualizar este roadmap.
