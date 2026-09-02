# Paquete de entrega contractual — Property Partners

Fecha de consolidación: 2 de septiembre de 2026

## 1. Propósito

Este documento resume qué está técnicamente listo para entrega, qué evidencia respalda ese estado y qué actividades siguen pendientes antes de la aceptación contractual final.

El producto está **técnicamente preparado para UAT**. Esto no equivale a aceptación comercial del Cliente.

## 2. Baseline productivo

- repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`;
- rama: `main`;
- producción: `https://ppartnersgroup.app`;
- commit: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- Vercel deployment: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- estado: `READY`;
- QA visual desktop: PASS;
- QA visual móvil estrecho: PASS.

## 3. Gate técnico de entrega

Resultado: **PASS técnico / READY para UAT**.

Evidencia del candidato que produjo el baseline:

- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS;
- preview Vercel: `READY`;
- runtime final revisado: sin warnings/errors/fatal atribuibles al cambio;
- navegación pública y autenticada: PASS;
- responsive móvil: PASS;
- PR #183 mergeado con el head validado;
- deployment productivo posterior al merge: `READY`.

Si UAT produce un cambio de código, este gate debe repetirse sobre el nuevo candidato.

## 4. Alcance contractual

Los tres pilares son:

1. **Inteligencia de Mercado**.
2. **Valorización de Propiedades**.
3. **Control de Gestión y Automatización de Reportes**.

No se amplía alcance por medio de documentación, experimentos históricos o mejoras complementarias.

## 5. Pilar I — Inteligencia de Mercado

**Estado técnico: PASS.**

Entregado técnicamente:

- ingestión y persistencia de observaciones;
- trazabilidad de fuente y frescura;
- separación entre oferta activa y compraventas CBRS;
- KML/barrios de Vitacura;
- inteligencia oferta vs ventas;
- propiedad canónica separada de listing live;
- cola de revisión live separada de la revisión histórica de duplicados;
- CTAs operativos alineados a la cola correcta;
- datos faltantes/frescura representados explícitamente;
- métricas UF/m² de casas con base de superficie construida cuando corresponde.

Snapshot de auditoría del 2 de septiembre de 2026:

- 44 casas activas;
- 44/44 con barrio KML resoluble;
- 41/44 utilizables para UF/m² construido.

Pendiente para aceptación:

- validar con Property Partners suficiencia de filtros, nomenclatura, barrios y lectura diaria;
- registrar observaciones de negocio como UAT, no como supuestos técnicos.

## 6. Pilar II — Valorización de Propiedades

**Estado técnico: PASS.**

Entregado técnicamente:

- identificación canónica de propiedad;
- flujo guiado;
- mínimo de tres comparables seleccionados por humano;
- cálculo determinístico y trazable;
- justificación profesional;
- revisión y devolución;
- corrección y reenvío;
- aprobación CEO con MFA/AAL2;
- snapshots/versiones e integridad;
- emisión y PDF desde snapshot;
- historial y decisiones auditables.

Pendiente para aceptación:

- ejecutar caso real punta a punta con roles Property Partners;
- revisar resultado, PDF e historial con el Cliente.

## 7. Pilar III — Control de Gestión y Reportes

**Estado técnico: PASS técnico.**

Entregado técnicamente:

- scopes por rol;
- métricas persistidas y reconciliación;
- tareas y seguimiento;
- infraestructura de metas/alertas;
- reportes desde snapshots;
- generación PDF;
- delivery trazable;
- retries e idempotencia;
- scheduling protegido;
- fail-closed si faltan definiciones aprobadas.

Dependencias externas aún no deben inventarse:

- diccionario KPI oficial;
- metas y umbrales;
- rankings/desempates;
- calendario y periodicidad;
- destinatarios de reportes.

El motor puede estar técnicamente entregable aunque esas funciones permanezcan deliberadamente bloqueadas.

## 8. Mejora complementaria — Cotizador público referencial

El cotizador público ya está productivo dentro del baseline actual.

No forma parte de los criterios de aceptación contractual de los tres pilares.

Características verificadas:

- sólo casas en Vitacura;
- 19 sectores KML seleccionables;
- estimación sectorial sólo con >=5 observaciones utilizables;
- fallback explícito a referencia general de Vitacura bajo ese piso;
- UF/m² construido derivado desde precio UF / superficie construida;
- dormitorios y baños opcionales sin degradar una muestra válida cuando falta cobertura;
- no captura datos personales;
- no expone listings/comparables crudos;
- responsive desktop y móvil verificado;
- dashboard autenticado permanece separado.

Snapshot auditado:

- 41 observaciones utilizables;
- Santa María 12;
- La Llavería 7;
- Club de Polo 6.

Detalle: `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.

## 9. Seguridad y autorización

La entrega mantiene:

- capacidades server-side;
- scopes global/oficina/personal;
- RLS autenticada;
- separación entre UI visible y autoridad real;
- operaciones privilegiadas server-only;
- MFA/AAL2 para operaciones críticas de valorización;
- límites de propiedad intelectual N3uralia verificados por gate.

La ausencia de un botón en UI nunca sustituye autorización server-side.

## 10. Documentación canónica de entrega

Punto de entrada: `docs/README.md`.

Documentos principales:

- `ROADMAP.md` — roadmap contractual de cierre;
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` — este paquete;
- `docs/TECHNICAL_CLOSURE_RECORD.md` — evidencia técnica;
- `docs/UAT_PROPERTY_PARTNERS.md` — plan UAT;
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md` — aceptación final;
- `docs/USER_MANUAL.md` — usuarios;
- `docs/ADMIN_MANUAL.md` — administración;
- `docs/SECURITY_AUTHORIZATION_MODEL.md` — seguridad;
- `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md` — mejora pública;
- `docs/VALUATION_CANONICAL_METHODOLOGY_V2.md` — valorización.

Roadmaps experimentales, agentes históricos, ML y documentos V2 no citados por el canon se consideran referencia histórica, no definición de entrega.

## 11. Siguiente gate — UAT Property Partners

Plan: `docs/UAT_PROPERTY_PARTNERS.md`.

Debe ejecutarse con usuarios autorizados sobre los tres pilares.

Criterio de salida:

- P0 = 0;
- P1 = 0;
- P2/P3 corregidos, aceptados o programados;
- resultado por pilar registrado;
- cualquier cambio posterior vuelve a pasar el gate técnico.

## 12. Dependencias externas vigentes

Según aplique:

- definiciones KPI;
- metas/umbrales/ranking;
- calendario y destinatarios;
- fuentes adicionales solicitadas por Property Partners;
- políticas adicionales de privacidad/retención;
- responsables y registro de aceptación.

Estas dependencias deben permanecer separadas de defectos del producto.

## 13. Cierre contractual pendiente

Para declarar DONE contractual aún corresponde:

1. ejecutar UAT;
2. corregir/revalidar cualquier P0/P1;
3. registrar P2/P3 y dependencias externas;
4. ejecutar capacitación por rol;
5. consolidar acta/minuta de aceptación;
6. congelar el baseline final de release;
7. mantener fail-closed las automatizaciones dependientes de definiciones no aprobadas.

## 14. Estado de entrega

**Técnicamente: grado A / listo para UAT.**

**Contractualmente: pendiente de UAT, capacitación y aceptación formal.**