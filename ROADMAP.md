# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 22:02 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 87%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 94% |
| 3 | Director y subdirector | Cierre funcional | 96% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 98% |
| 5 | Integración transversal de módulos | Cierre funcional | 92% |
| 6 | QA contractual, seguridad y aceptación | En desarrollo | 60% |

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

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, presentación, reporte y metodología.
- [x] Centro de decisiones conectado con valorizaciones abiertas.
- [x] Oficina, ejecutiva, versión, estado, última decisión y tareas derivadas visibles.
- [x] Responsable, prioridad, vencimiento e historial conectados.
- [x] Navegación CEO → oficina → expediente.
- [ ] Confirmar reglas oficiales de ranking y umbrales derivados.
- [ ] QA visual autenticado y validación de PDF.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: cierre funcional — 92%**

## Completado

- [x] Mercado → publicación persistida → comparable candidato.
- [x] Selector de valorizaciones en borrador limitado por alcance autenticado.
- [x] Evidencia mínima persistida: publicación, propiedad, URL y fecha observada.
- [x] Precio UF y UF/m² conservados desde el Módulo I.
- [x] Duplicados bloqueados por expediente y publicación.
- [x] Registro `market_comparable_linked` en historial de decisiones.
- [x] La publicación se mantiene como candidata hasta decisión explícita.
- [x] Navegación del Módulo I incluye acceso a conexión de comparables.
- [x] Propiedad → asignación → valorización.
- [x] Valorización → historial y expediente.
- [x] Alerta → tarea asignada → seguimiento de oficina.
- [x] Revisión → devolución → tarea → corrección → reenvío.
- [x] Decisión CEO → oficina → responsable → caso → historial.

## Evidencias nuevas

- `app/api/market/comparables/route.ts`
- `app/dashboard/market/layout.tsx`
- `app/dashboard/market/comparables/page.tsx`
- `components/market/market-comparable-connector.tsx`
- `scripts/test-market-comparable-link.sql`
- Commit API: `8509f5140910a5d56a9a5e457cfdb7464cc3a3ae`
- Commit navegación: `14192e9c0bbac76759ee31117514c6c28941f6f5`
- Commit interfaz: `4b7599a0688d1134cf7cfce7c73eb06a077e32a4`
- Commit workspace: `dfb5b644474cbff507378eddbd14eb2555478259`
- Commit QA reversible: `0e6ec3fc3fd5562c6689c75f25a4624b0f18a99d`

## Pendiente para cierre total

- [ ] Ejecutar el script con IDs QA conocidos y confirmar `ROLLBACK`.
- [ ] Incorporar la evidencia de origen en el reporte imprimible de valorización.
- [ ] QA visual autenticado del selector y del expediente resultante.

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en desarrollo — 60%**

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas y valorizaciones propias.
- [x] Prueba negativa de dirección entre oficinas.
- [x] Rutas operativas conectadas desde CEO hasta expediente.
- [x] Guion reversible mercado → comparable → valorización.
- [ ] Ejecutar ciclos integrales con fixtures QA conocidos.
- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive, accesibilidad, logs, reportes y PDF.

# Riesgos activos

1. Faltan IDs QA controlados para ejecutar algunos ciclos reversibles completos.
2. No existe una cuenta QA de subdirector para prueba independiente.
3. Falta navegador autenticado para validar recorridos visuales y PDF.
4. Captaciones brutas no tiene fuente separada.
5. Umbrales y ranking requieren validación de negocio.

# Salvaguardas

- No modificar cuentas reales ni persistir datos QA ficticios.
- No presentar publicaciones como ventas confirmadas.
- No inventar diferencias de permisos no documentadas.
- No usar `service_role` como evidencia de RLS.
- No afirmar QA visual cuando sólo se validaron rutas, build o datos.
- No cerrar un bloque sin build y deployment verificados.

# Bloque activo

## Bloque 6 — QA contractual y aceptación — Próximo trabajo 1 · 2 · 3

1. Preparar fixtures QA reversibles controlados para los ciclos dirección–ejecutiva y mercado–valorización.
2. Ejecutar escrituras autorizadas y bloqueadas por perfil, documentando resultados y limpieza.
3. Auditar responsive, accesibilidad, reportes, PDF, runtime y checklist final contra contrato.
