# Paquete de entrega contractual — Property Partners

Fecha de consolidación: 30 de julio de 2026

## 1. Propósito

Este documento consolida las evidencias técnicas y funcionales disponibles para la aceptación del alcance contratado. No reemplaza la validación visual autenticada ni las definiciones de negocio pendientes.

## 2. Plataforma y producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama de entrega: `main`
- Producción: `https://n3uralia-intelligence-platform.vercel.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Control de acceso: matriz central de capacidades, `getUserScope()`, guards de páginas y APIs, y RLS autenticada.

## 3. Evidencia por perfil

### CEO

- Consolidado global, oficinas, metas, MoM, YoY y evolución.
- Centro de decisiones conectado con oficina, ejecutiva, valorización, tarea, responsable e historial.
- Navegación global → oficina → expediente → reporte.

### Dirección y subdirección

- Alcance de oficina resuelto centralmente.
- Equipo, fichas, tareas, metas, comparaciones y valorizaciones en revisión.
- Devolución con motivo, tarea de corrección, reenvío e historial versionado.
- Aislamiento autenticado entre oficinas verificado.

### Ejecutiva

- Alcance personal, propiedades asignadas, tareas y alertas.
- Propiedad asignada → valorización con evidencia de origen.
- Corrección de borrador, comparables, envío a revisión y reenvío.
- Métricas personales con fuente y período.

## 4. Integración transversal

- Mercado → publicación persistida → comparable candidato.
- Propiedad → asignación → valorización.
- Valorización → historial, decisiones y reporte imprimible.
- Alerta/revisión → tarea → responsable → seguimiento.
- CEO → oficina → responsable → caso → evidencia.

## 5. Seguridad y QA reproducible

- Matriz RLS autenticada para CEO, dirección y tres ejecutivas.
- Pruebas negativas entre oficinas y perfiles.
- Escrituras QA reversibles con `ROLLBACK`.
- Separación entre propiedad operativa e identidad canónica confirmada.
- Regresiones estáticas de capacidades, navegación al reporte y accesibilidad estructural.

Scripts principales:

- `scripts/test-access-control.mjs`
- `scripts/test-authenticated-scope.sql`
- `scripts/test-partner-reversible-qa.sql`
- `scripts/test-director-office-scope.sql`
- `scripts/test-valuation-return-cycle.sql`
- `scripts/test-market-comparable-link.sql`
- `scripts/test-valuation-report-access.mjs`
- `scripts/test-central-access-regression.mjs`

## 6. Documentación de aceptación

- `ROADMAP.md`
- `docs/QA_ACCEPTANCE_MATRIX.md`
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`
- `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md`
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md`

## 7. Pendientes externos

### Requieren navegador autenticado

- Recorrido visual completo de todos los perfiles QA.
- Responsive real en móvil, tableta y escritorio.
- Navegación completa por teclado y lector de pantalla.
- Medición de contraste.
- Impresión y PDF autenticados.

### Requieren definición de negocio

- Regla oficial de ranking.
- Umbrales oficiales de alertas.
- Fuente separada para captaciones brutas.
- Designación de una cuenta QA subdirector si se requiere evidencia independiente.

## 8. Criterio de cierre

La entrega técnica puede considerarse cerrada cuando `main` compile, el deployment productivo esté `READY`, no existan errores críticos de runtime y las regresiones reproducibles pasen. La aceptación definitiva requiere completar los pendientes visuales y de negocio indicados arriba.
