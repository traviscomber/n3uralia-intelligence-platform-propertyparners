# Paquete de entrega contractual — Property Partners

Fecha de consolidación: 6 de agosto de 2026

## 1. Propósito

Este documento consolida las evidencias técnicas y funcionales disponibles para la aceptación del alcance contratado. No reemplaza la validación visual autenticada ni las definiciones de negocio pendientes.

## 2. Plataforma y producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama de entrega: `main`
- Supabase: `orfncinmhymhhoxbxgjb`
- Control de acceso: matriz central de capacidades, scopes por rol, guards de páginas y APIs, y RLS autenticada.

## 3. Evidencia por perfil

### CEO

- Consolidado global, oficinas, metas, evolución e indicadores ejecutivos disponibles.
- Centro de decisiones conectado con oficina, valorización, tarea, responsable e historial.
- Navegación global → oficina → expediente → reporte.

### Dirección y subdirección

- Alcance de oficina resuelto centralmente.
- Equipo, propiedades, tareas, metas, comparaciones y valorizaciones en revisión.
- Devolución con motivo, corrección, reenvío e historial versionado.
- Aislamiento autenticado entre oficinas.

### Partner

- Alcance personal, propiedades asignadas, tareas y alertas.
- Propiedad asignada → valorización con evidencia de origen.
- Corrección de borrador, comparables, envío a revisión y reenvío.
- Métricas personales con fuente y período cuando existe evidencia disponible.

## 4. Integración transversal

- Mercado → publicación persistida → comparable candidato.
- Propiedad → asignación → valorización.
- Valorización → historial, decisiones y reporte imprimible.
- Alerta/revisión → tarea → responsable → seguimiento.
- CEO → oficina → responsable → caso → evidencia.

Cadena operativa del producto:

`Data canónica → inteligencia → acción → responsable → seguimiento → resultado → informe`

## 5. Seguridad y QA reproducible

- Matriz RLS autenticada por alcance global, oficina y personal.
- Pruebas negativas entre oficinas y perfiles.
- Escrituras QA reversibles con `ROLLBACK` cuando corresponde.
- Separación entre propiedad operativa e identidad canónica confirmada.
- Regresiones estáticas de capacidades, navegación al reporte y accesibilidad estructural.
- Helpers de autorización retirados del esquema público cuando corresponde.
- Aprobación global de valorizaciones reservada al CEO.

Scripts principales:

- `scripts/test-access-control.mjs`
- `scripts/test-authenticated-scope.sql`
- `scripts/test-partner-reversible-qa.sql`
- `scripts/test-director-office-scope.sql`
- `scripts/test-valuation-return-cycle.sql`
- `scripts/test-market-comparable-link.sql`
- `scripts/test-valuation-report-access.mjs`
- `scripts/test-central-access-regression.mjs`

## 6. Documentación de aceptación y operación

- `ROADMAP.md`
- `docs/PRODUCT_ROADMAP.md`
- `docs/CANONICAL_DELIVERY_PLAN.md`
- `docs/CONTRACTUAL_SCOPE_MATRIX.md`
- `docs/QA_ACCEPTANCE_MATRIX.md`
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`
- `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md`
- `docs/USER_MANUAL.md`
- `docs/ADMIN_MANUAL.md`
- `docs/SECURITY_AUTHORIZATION_MODEL.md`
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md`

Los manuales de usuario y administración describen únicamente funciones y restricciones verificables de la implementación actual. No fijan reglas de negocio que aún dependan del Cliente.

## 7. Pendientes externos

### Requieren validación autenticada/UAT

- Recorrido visual completo de los perfiles finales.
- Responsive real en móvil, tableta y escritorio.
- Navegación completa por teclado y lector de pantalla.
- Medición final de contraste.
- Impresión y PDF sobre casos reales.

### Requieren definición o fuente de negocio

- Regla oficial de ranking.
- Umbrales oficiales de alertas y escalamiento.
- Fuente/definición separada para captaciones brutas.
- Metas o fórmulas no presentes en fuentes canónicas.
- Calendario y destinatarios finales de reportes.
- Fuente adicional de ventas recientes.
- KML final si todavía no ha sido aceptado como fuente oficial.

## 8. Criterio de cierre

La entrega técnica puede considerarse cerrada cuando `main` compile, el deployment productivo esté `READY`, no existan errores críticos de runtime y las regresiones reproducibles pasen.

La aceptación definitiva requiere completar UAT, validación sobre datos reales y las definiciones/fuentes externas indicadas arriba. Las dependencias del Cliente deben mantenerse separadas de los defectos técnicos y no deben resolverse mediante datos ficticios o reglas inferidas.
