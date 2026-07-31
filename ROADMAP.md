# Property Partners Intelligence Platform — Roadmap contractual

Última actualización: 30 de julio de 2026, 22:12 CLT

## Objetivo

Completar estrictamente el alcance contratado mediante una plataforma integrada de inteligencia de mercado, valorización y control de gestión, con experiencias diferenciadas para CEO, administración, directores, subdirectores y ejecutivas.

Este archivo es la fuente operativa única. Cada bloque exige commit en `main`, build y TypeScript aprobados, deployment `READY`, revisión de runtime y actualización de evidencias.

## Estado general

**Avance contractual estimado: 92%**

| Bloque | Enfoque | Estado | Avance |
|---|---|---|---:|
| 1 | Perfiles, capacidades y alcance central | Completado | 100% |
| 2 | Flujo completo de ejecutiva | Cierre funcional | 96% |
| 3 | Director y subdirector | Cierre funcional | 96% |
| 4 | CEO y consolidación ejecutiva | Cierre funcional | 98% |
| 5 | Integración transversal de módulos | Cierre funcional | 98% |
| 6 | QA contractual, seguridad y aceptación | En cierre | 80% |

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

**Estado: cierre funcional — 96%**

- [x] Métricas personales con metas, MoM, YoY, fuente y período.
- [x] Propiedad asignada → valorización trazable.
- [x] Tareas personales, historial y observaciones.
- [x] Corrección de ficha restringida al propietario en borrador.
- [x] Reporte imprimible de valorización con comparables y decisiones.
- [x] Estados vacíos y errores recuperables incorporados en el reporte.
- [ ] QA visual autenticado y revisión responsive real.

---

# Bloque 3 — Director y subdirector

**Estado: cierre funcional — 96%**

- [x] Dashboard, YoY, equipo, fichas, tareas e historial.
- [x] Asignación por oficina, reporte y comparación con promedio.
- [x] API de tareas migrada a alcance central.
- [x] Workspace con cola de valorizaciones, responsables y tareas.
- [x] Aislamiento autenticado entre oficinas.
- [x] Devolución → tarea → corrección → reenvío e historial versionado.
- [ ] Recorrido visual autenticado y cuenta QA subdirector sólo con autorización explícita.

---

# Bloque 4 — CEO y consolidación ejecutiva

**Estado: cierre funcional — 98%**

- [x] Consolidado, oficinas, metas, MoM, YoY, rankings y evolución.
- [x] Cartera, presentación, reporte y metodología.
- [x] Centro de decisiones conectado con oficina, ejecutiva, caso, tarea e historial.
- [x] Navegación CEO → oficina → expediente.
- [ ] Confirmar reglas oficiales de ranking y umbrales derivados.
- [ ] QA visual autenticado y validación de PDF.

Captaciones brutas permanece como `n/d` mientras no exista una fuente explícita separada.

---

# Bloque 5 — Integración transversal

**Estado: cierre funcional — 98%**

- [x] Mercado → publicación persistida → comparable candidato.
- [x] Selector de valorizaciones en borrador limitado por alcance.
- [x] Evidencia de publicación, propiedad operativa, fecha observada y precio.
- [x] Duplicados bloqueados por expediente y publicación.
- [x] Registro `market_comparable_linked`.
- [x] Propiedad → asignación → valorización.
- [x] Alerta → tarea → seguimiento.
- [x] Revisión → devolución → corrección → reenvío.
- [x] Decisión CEO → oficina → responsable → caso.
- [x] Propiedad operativa no confirmada separada de identidad canónica.
- [x] Evidencia de origen, ajustes y decisiones incorporados al reporte imprimible.
- [ ] QA visual del selector, expediente y reporte.

## Evidencias recientes

- `app/dashboard/valuations/[id]/report/page.tsx`
- `components/valuation/valuation-evidence-report.tsx`
- Commit ruta protegida: `65c1e12f7e7b53c83a1df9591edf449b617144b7`
- Commit reporte: `5da73a11e0d8890445804ef2d55a222a6d22a49d`
- Commit guard corregido: `66bc0cf0cad5d8e53b89aa4de8f8ba909b5edbaf`

---

# Bloque 6 — QA contractual, seguridad y aceptación

**Estado: en cierre — 80%**

## Completado

- [x] Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- [x] Aislamiento por oficina y ejecutiva.
- [x] Escrituras QA reversibles para tareas, valorizaciones y comparables.
- [x] Prueba negativa de dirección entre oficinas.
- [x] Rutas operativas conectadas desde CEO hasta expediente.
- [x] QA reversible mercado → comparable → valorización con `ROLLBACK`.
- [x] Matriz de aceptación por rol y flujo.
- [x] Checklist final por requisito contractual.
- [x] Reporte con estructura semántica, tablas accesibles, foco visible y estados recuperables.
- [x] Diseño responsive por código: grids adaptativos y tablas desplazables.

## Evidencias

- `docs/QA_ACCEPTANCE_MATRIX.md`
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`
- `components/valuation/valuation-evidence-report.tsx`
- Commit checklist final: `09d04a6da04c14dc3a3df3471a36463a059a1234`

## Pendiente

- [ ] Login y recorrido real para todos los perfiles QA.
- [ ] Responsive móvil/tableta validado en navegador.
- [ ] Navegación completa por teclado y lector de pantalla.
- [ ] Contraste medido.
- [ ] Reportes y PDF revisados con sesión autenticada.
- [ ] Ciclo integral visual dirección–ejecutiva.

# Pendientes separados por naturaleza

## Técnicos

- Validar el último deployment funcional y runtime.
- Completar cualquier corrección revelada por build o TypeScript.

## Visuales

- QA autenticado en móvil, tableta y escritorio.
- Impresión/PDF de valorización, dirección y CEO.
- Teclado, foco, lector de pantalla y contraste.

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

## Cierre técnico y preparación de QA visual — Próximo trabajo 1 · 2 · 3

1. Verificar build, TypeScript, deployment y runtime del reporte imprimible y corregir cualquier fallo.
2. Añadir acceso directo al reporte desde expediente, dirección y centro de decisiones, manteniendo permisos.
3. Preparar una guía de ejecución de QA visual autenticado por perfil y dispositivo para cerrar los pendientes restantes.
