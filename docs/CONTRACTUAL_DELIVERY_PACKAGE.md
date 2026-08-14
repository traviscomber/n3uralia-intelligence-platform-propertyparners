# Paquete de entrega contractual — Property Partners

Fecha de consolidación: 6 de agosto de 2026

## 1. Propósito

Este documento consolida las evidencias técnicas y funcionales disponibles para la aceptación del alcance contratado. No reemplaza la validación visual autenticada ni las definiciones de negocio pendientes.

## 2. Plataforma y producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama de entrega: `main`
- Producción: `https://ppartnersgroup.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Control de acceso: matriz central de capacidades, scopes por rol, guards de páginas y APIs, RLS autenticada y MFA/AAL2 en operaciones críticas de valorización.

## 3. Evidencia por perfil

### CEO

- Consolidado global, oficinas, metas, evolución e indicadores ejecutivos disponibles.
- Centro de decisiones conectado con oficina, valorización, tarea, responsable e historial.
- Acceso a Mercado, Propiedades, Informes y gestión administrativa.
- Aprobación y emisión de valorizaciones con segundo factor.

### Dirección y subdirección

- Alcance de oficina resuelto centralmente.
- Equipo, propiedades, tareas, metas, comparaciones y valorizaciones en revisión.
- Devolución con motivo, corrección, reenvío e historial versionado.
- Aislamiento entre oficinas.

### Partner

- Alcance personal, propiedades asignadas, tareas y alertas.
- Propiedad asignada → valorización con evidencia de origen.
- Corrección de borrador, comparables, envío a revisión y reenvío.
- Métricas personales con fuente y período cuando existe evidencia disponible.

## 4. Integración transversal

Cadena operativa del producto:

`Data canónica → inteligencia → acción → responsable → seguimiento → resultado → informe`

Flujos técnicos disponibles:

- Mercado → publicación persistida → comparable candidato.
- Fuente → ingestión → raw record → normalización → historial → estado/frescura/error.
- Propiedad → asignación → valorización.
- Valorización → historial → decisiones → aprobación → reporte.
- Alerta/revisión → tarea → responsable → seguimiento.
- CEO → oficina → responsable → caso → evidencia.
- Informe canónico → artefacto → historial → entrega operativa.

## 5. Seguridad y QA reproducible

- Matriz RLS por alcance global, oficina y personal.
- Pruebas negativas entre oficinas y perfiles.
- Escrituras QA reversibles con `ROLLBACK` cuando corresponde.
- Separación entre propiedad operativa e identidad canónica confirmada.
- Helpers de autorización internos fuera del esquema API público cuando corresponde.
- Aprobación global de valorizaciones reservada al CEO.
- MFA/AAL2 para aprobación y emisión.
- Fallos de ingestión persistidos y fuente puesta en cuarentena.
- Informes técnicos/fixtures excluidos de la vista canónica del cliente.

Comando consolidado de aceptación técnica:

`pnpm qa:technical`

Este runner agrupa verificaciones de acceso/contrato, Mercado, Valorización, Control de Gestión, trazabilidad/documentos y build de producción. No sustituye el UAT visual autenticado.

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
- `docs/VALUATION_PRODUCTION_READINESS.md`
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md`

Los manuales describen únicamente funciones y restricciones verificables de la implementación actual. No fijan reglas de negocio que aún dependan del Cliente.

## 7. Estado de los tres pilares

### Pilar I — Inteligencia de Mercado

La arquitectura de ingestión, normalización, raw records, deduplicación, historial, control de fallos, cuarentena y observabilidad está disponible. Las ventas confirmadas CBRS y otras fuentes oficiales siguen dependiendo de la entrega o disponibilidad de evidencia real.

### Pilar II — Valorización

El motor, workflow, aprobación, trazabilidad y reporte están técnicamente preparados. El primer caso end-to-end real queda bloqueado por ausencia de una propiedad sujeto y comparables/transacciones canónicos suficientes. No se crea un caso ficticio para simular cierre.

### Pilar III — Control de Gestión Comercial

Las vistas por alcance, metas, alertas, tareas, seguimiento e informes están disponibles. Captaciones, fórmulas, rankings, umbrales y reglas definitivas permanecen como dependencias cuando no existe definición oficial del Cliente.

## 8. Informes canónicos

- la vista canónica no muestra documentos etiquetados como `reportin-test`, `qa`, `mock`, `demo` o `fixture`;
- el CTA de generación conduce al centro operativo real `/dashboard/reportes/operacion`;
- el endpoint IA heredado no auditado permanece retirado;
- modelo, prompt, costo y fuentes se muestran cuando existen en metadata canónica; si faltan, se presenta `—` en vez de inferirlos;
- la disponibilidad del PDF se calcula desde el artefacto real y no desde una etiqueta.

## 9. Pendientes externos

### Requieren validación autenticada/UAT

- recorrido visual completo de los perfiles finales;
- responsive real en móvil, tableta y escritorio;
- navegación completa por teclado y lector de pantalla;
- medición final de contraste;
- impresión y PDF sobre casos reales.

### Requieren definición o fuente del Cliente

- regla oficial de ranking;
- umbrales oficiales de alertas y escalamiento;
- fuente/definición separada para captaciones brutas;
- metas o fórmulas no presentes en fuentes canónicas;
- calendario y destinatarios finales de reportes;
- fuente adicional de ventas recientes;
- KML final si todavía no ha sido aceptado como fuente oficial.

## 10. Criterio de cierre técnico

La parte bajo control de N3uralia puede considerarse lista cuando simultáneamente:

1. `pnpm qa:technical` termina sin errores;
2. el último commit de `main` tiene deployment productivo `READY`;
3. no existen errores críticos de runtime asociados al release;
4. las verificaciones de seguridad/RLS continúan vigentes;
5. los tres pilares mantienen sus flujos técnicos disponibles sin mocks;
6. todas las dependencias externas están identificadas como tales y no convertidas en datos inventados.

La aceptación contractual definitiva requiere UAT, validación sobre datos reales y las definiciones/fuentes externas indicadas arriba.
