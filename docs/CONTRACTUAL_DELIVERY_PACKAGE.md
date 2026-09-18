> **Cierre vigente — 18 de septiembre de 2026:** usar `docs/FINAL_CLOSEOUT_2026-09-18.md` como hoja ejecutiva de cierre y UAT. Baseline de cierre: `002805a52c660155b8a71cb90528ee78725e9067`. Este documento conserva el detalle contractual/técnico histórico.

# Paquete de entrega contractual — Property Partners

Fecha de consolidación: 2 de septiembre de 2026

## 1. Propósito

Este documento consolida la evidencia técnica y funcional disponible para entregar la plataforma a UAT de Property Partners. El gate técnico está verificado; la aceptación contractual definitiva requiere ejecución de UAT, capacitación y registro de aceptación.

No se consideran resueltas por defecto las definiciones de negocio que siguen dependiendo del Cliente.

## 2. Plataforma y baseline de producción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`
- Rama operativa: `main`
- Producción: `https://ppartnersgroup.app`
- Supabase: `orfncinmhymhhoxbxgjb`
- Baseline productivo verificado: `067870537c3e8b897f2f07359dd45b9776ea8095`
- Vercel: `READY`
- Errores runtime observados en las últimas 24 horas durante la revisión: 0
- Control de acceso: matriz central de capacidades, scopes por rol, guards de páginas y APIs, RLS autenticada y MFA/AAL2 en operaciones críticas de valorización.

## 3. Gate técnico de entrega

Resultado sobre el baseline productivo:

- `Contractual modules CI`: PASS;
- `Authenticated role QA`: PASS;
- `Authenticated visual QA`: PASS;
- `N3uralia IP Boundaries`: PASS;
- deployment productivo: PASS / `READY`;
- runtime scan de la ventana revisada: PASS, sin errores observados.

Estado de release: **PASS técnico / READY para UAT**.

Este resultado no equivale a aceptación comercial del Cliente.

## 4. Evidencia por perfil

### CEO

- Consolidado global, oficinas, metas, evolución e indicadores ejecutivos disponibles según evidencia canónica.
- Centro de decisiones conectado con oficina, valorización, tarea, responsable e historial.
- Acceso a Mercado, Propiedades, Informes y gestión administrativa según capacidades.
- Aprobación y emisión de valorizaciones protegidas por segundo factor/AAL2.

### Dirección y subdirección

- Alcance de oficina resuelto centralmente.
- Equipo, propiedades, tareas, metas, comparaciones y valorizaciones en revisión.
- Devolución con motivo, corrección, reenvío e historial versionado.
- Aislamiento entre oficinas.

### Partner / Ejecutivo

- Alcance personal, propiedades asignadas, tareas y alertas.
- Propiedad asignada → valorización con evidencia de origen.
- Corrección de borrador, comparables, envío a revisión y reenvío.
- Métricas personales con fuente y período cuando existe evidencia disponible.

## 5. Integración transversal

Cadena operativa del producto:

`Data canónica → inteligencia → acción → responsable → seguimiento → resultado → informe`

Flujos técnicos disponibles:

- Mercado → publicación persistida → comparable candidato.
- Fuente → ingestión → raw record → normalización → historial → estado/frescura/error.
- Listing live → revisión operativa → propiedad canónica, sin confundirlo con revisión histórica property ↔ property.
- Propiedad → asignación → valorización.
- Valorización → historial → decisiones → aprobación MFA → emisión → reporte.
- Alerta/revisión → tarea → responsable → seguimiento.
- CEO → oficina → responsable → caso → evidencia.
- Informe canónico → artefacto → historial → entrega operativa.

Los CTAs de “Qué requiere atención” están alineados con la cola operativa live correspondiente.

## 6. Seguridad y QA reproducible

- Matriz RLS por alcance global, oficina y personal.
- Pruebas negativas entre oficinas y perfiles.
- Escrituras QA reversibles con `ROLLBACK` cuando corresponde.
- Separación entre propiedad operativa e identidad canónica confirmada.
- Helpers de autorización internos fuera del esquema API público cuando corresponde.
- Aprobación global de valorizaciones reservada al CEO.
- MFA/AAL2 para aprobación y emisión.
- Fallos de ingestión persistidos y fuentes fallidas tratadas de forma fail-closed.
- Informes técnicos/fixtures excluidos de la vista canónica del cliente.
- Límites de propiedad intelectual N3uralia cubiertos por gate automatizado.

Si se modifica código a raíz del UAT, los gates deben repetirse sobre el nuevo candidato antes de congelar release.

## 7. Documentación de aceptación y operación

Documentación principal existente:

- `ROADMAP.md`
- `docs/UAT_PROPERTY_PARTNERS.md`
- `docs/PRODUCT_ROADMAP.md`
- `docs/CANONICAL_DELIVERY_PLAN.md`
- `docs/CONTRACTUAL_SCOPE_MATRIX.md`
- `docs/QA_ACCEPTANCE_MATRIX.md`
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`
- `docs/TECHNICAL_CLOSURE_RECORD.md`
- `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`
- `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md`
- `docs/AUTOMATED_VISUAL_QA_RUNBOOK.md`
- `docs/USER_MANUAL.md`
- `docs/ADMIN_MANUAL.md`
- `docs/SECURITY_AUTHORIZATION_MODEL.md`
- `docs/VALUATION_PRODUCTION_READINESS.md`
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md`

Los manuales describen únicamente funciones y restricciones verificables de la implementación. No fijan como oficiales reglas de negocio que aún dependan del Cliente.

## 8. Estado de los tres pilares

### Pilar I — Inteligencia de Mercado — PASS técnico

La arquitectura de ingestión, normalización, raw records, deduplicación, historial, control de fallos, observabilidad, territorialidad e inteligencia oferta/ventas está disponible. La revisión operativa de listings live está separada de la revisión histórica de duplicados y sus accesos principales fueron alineados.

Pendiente: UAT de suficiencia operacional de filtros, barrios, nomenclatura, frescura y estados sin datos. Fuentes adicionales que el Cliente requiera siguen siendo dependencias externas hasta ser entregadas y validadas.

### Pilar II — Valorización — PASS técnico

Motor, comparables, workflow, devolución/reenvío, aprobación CEO con MFA, snapshots, trazabilidad, emisión y reporte están técnicamente preparados.

Pendiente: ejecutar el caso UAT real de punta a punta. No se crea una valorización ficticia para simular aceptación.

### Pilar III — Control de Gestión y Reportes — PASS técnico

Vistas por alcance, métricas persistidas, reconciliación, metas/alertas como infraestructura, tareas, seguimiento, informes y scheduling protegido están disponibles.

La recurrencia debe permanecer fail-closed mientras falten definiciones oficiales de KPI, metas, umbrales, ranking, calendario o destinatarios.

## 9. Informes canónicos

- la vista canónica no muestra documentos etiquetados como `reportin-test`, `qa`, `mock`, `demo` o `fixture`;
- el CTA de generación conduce al centro operativo real `/dashboard/reportes/operacion`;
- el endpoint IA heredado no auditado permanece retirado;
- modelo, prompt, costo y fuentes se muestran cuando existen en metadata canónica; si faltan, se presenta `—` en vez de inferirlos;
- la disponibilidad del PDF se calcula desde el artefacto real y no desde una etiqueta;
- la distribución recurrente no debe activarse sin configuración y destinatarios aprobados.

## 10. Siguiente gate: UAT Property Partners

Plan canónico: `docs/UAT_PROPERTY_PARTNERS.md`.

Debe ejecutarse con usuarios autorizados de Property Partners sobre los tres pilares. Los resultados se registran `PASS`, `FAIL` o `BLOCKED_EXTERNAL`, con severidad P0-P3 cuando exista defecto.

Criterio de salida:

- P0 = 0;
- P1 = 0;
- P2/P3 corregidos, aceptados o programados sin bloquear el alcance contractual;
- aceptación por módulo o lista cerrada de correcciones;
- cualquier cambio posterior vuelve a pasar el gate técnico.

## 11. Dependencias externas vigentes

Según aplique y siempre sin inventar datos/reglas:

- diccionario KPI oficial;
- metas, umbrales, ranking y desempates definitivos;
- calendario, audiencias y destinatarios de reportes;
- fuentes/datasets adicionales que Property Partners determine como oficiales;
- políticas adicionales de retención, privacidad o integración;
- representantes y firma/registro de aceptación.

## 12. Cierre contractual pendiente

La parte bajo control técnico de N3uralia está lista para UAT sobre el baseline verificado.

Para declarar DONE contractual aún corresponde:

1. ejecutar UAT con Pedro Pablo y/o usuarios autorizados;
2. corregir y revalidar cualquier P0/P1;
3. registrar P2/P3 y dependencias externas;
4. ejecutar capacitación por rol;
5. consolidar acta/minuta de aceptación;
6. identificar y congelar el commit final de release;
7. mantener en estado fail-closed cualquier automatización dependiente de definiciones aún no aprobadas.

## 13. Mejora complementaria — Cotizador público referencial

Se documenta adicionalmente el candidato PR `#181`, rama `public-valuation-estimator-v1`, como una mejora complementaria de orientación/captación para visitantes externos.

Head funcional validado antes de incorporar la documentación de entrega: `363eafff6358f5b67f5b5662775eb1f43b8b1740`.

Sobre ese head funcional se verificó:

- preview Vercel: `READY`;
- `N3uralia IP Boundaries`: PASS;
- `Contractual modules CI`: PASS;
- suite de valorización: 28/28 PASS, incluyendo pruebas del estimador público;
- `/dashboard` permanece protegido sin sesión;
- el endpoint público entrega sólo agregados y no expone comparables/listings crudos.

Los commits posteriores son documentales y deben completar nuevamente los gates del PR antes del merge.

Cobertura pública inicial verificada para casas en Vitacura:

- Club de Polo: 6 observaciones utilizables;
- La Llavería: 7;
- Santa María: 11.

El estimador exige un mínimo de 5 observaciones, deriva UF/m² construido desde precio UF y superficie construida, y publica estimación central más rango intercuartil. Si la evidencia es insuficiente, no publica una cifra.

Esta mejora:

- no modifica el Valorizador Profesional contractual;
- no cambia el workflow Ejecutivo → Director → CEO;
- no sustituye MFA/AAL2, snapshots ni revisión humana;
- no forma parte del criterio de aprobación UAT de los tres pilares;
- no debe considerarse productiva hasta que PR #181 sea mergeado y el SHA resultante sea verificado en producción.

Detalle auditable: `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.
