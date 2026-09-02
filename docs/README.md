# Property Partners — Canon de documentación

Última actualización: 2 de septiembre de 2026

Este archivo es el punto de entrada de la documentación vigente de `Property Partners Intelligence Platform`.

Su propósito es evitar que documentos históricos, experimentales o previos a un release sean interpretados como estado contractual o productivo actual.

## 1. Estado ejecutivo vigente

Producción: `https://ppartnersgroup.app`

Baseline productivo verificado:

- rama: `main`;
- commit: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- deployment Vercel: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- estado deployment: `READY`;
- QA visual directa: PASS en desktop y viewport móvil estrecho;
- runtime del candidato previo al merge: sin warnings/errors/fatal en la ventana final revisada;
- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS.

Estado de los tres pilares:

| Pilar | Estado técnico | Siguiente gate |
|---|---|---|
| Inteligencia de Mercado | PASS | UAT de negocio |
| Valorización de Propiedades | PASS | UAT punta a punta |
| Control de Gestión + Reportes | PASS técnico | UAT + definiciones externas para recurrencia |

La plataforma está técnicamente preparada para UAT. Esto no equivale a aceptación contractual final del Cliente.

## 2. Snapshot de datos de mercado validado

Snapshot observado durante el hardening del 2 de septiembre de 2026:

- 44 casas activas en la fuente dedicada de Vitacura;
- 44/44 con barrio KML resoluble mediante la lógica canónica;
- 41/44 con precio UF y superficie construida utilizables para UF/m² construido;
- 19 sectores KML canónicos disponibles en el cotizador público;
- sectores con muestra sectorial de al menos 5 observaciones: Santa María 12, La Llavería 7, Club de Polo 6.

Estos valores son un snapshot de auditoría, no constantes de negocio. La UI y las APIs deben resolver la cobertura desde la evidencia live disponible.

## 3. Orden de autoridad documental

Cuando dos documentos parezcan contradecirse, usar este orden:

1. propuesta comercial, contrato, anexos y definiciones formalmente aprobadas por Property Partners;
2. este índice y el estado productivo verificable;
3. `ROADMAP.md` — roadmap contractual de cierre vigente;
4. `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` — paquete de entrega;
5. `docs/TECHNICAL_CLOSURE_RECORD.md` — evidencia de cierre técnico;
6. `docs/UAT_PROPERTY_PARTNERS.md` — plan de aceptación de negocio;
7. manuales y documentación de módulo;
8. documentos experimentales, históricos, V2 o de investigación.

Un documento histórico nunca amplía por sí solo el alcance contractual.

## 4. Documentos que debe leer cada audiencia

### Gerencia / Cliente

- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` — qué se entrega y qué falta para aceptación final.
- `docs/EXECUTIVE_PROJECT_CLOSURE.md` — resumen ejecutivo de cierre.
- `docs/UAT_PROPERTY_PARTNERS.md` — casos de aceptación de negocio.
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md` — checklist de aceptación final.
- `ROADMAP.md` — orden de cierre desde el estado actual.

### Usuarios operativos

- `docs/USER_MANUAL.md` — uso por rol.
- `docs/VALUATION_CANONICAL_METHODOLOGY_V2.md` — metodología canónica del valorizador profesional.
- `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md` — alcance del cotizador público referencial.

### Administración técnica / N3uralia

- `docs/ADMIN_MANUAL.md` — administración.
- `docs/TECHNICAL_CLOSURE_RECORD.md` — baseline y gates técnicos.
- `docs/SECURITY_AUTHORIZATION_MODEL.md` — roles, capabilities y aislamiento.
- `docs/AUTHENTICATED_VISUAL_QA_GUIDE.md` — QA autenticado.
- `docs/AUTOMATED_VISUAL_QA_RUNBOOK.md` — ejecución reproducible de QA visual.
- `docs/QA_ACCEPTANCE_MATRIX.md` — matriz de aceptación técnica.

### Inteligencia de mercado y datos

- `docs/PP_MARKET_INTELLIGENCE_STRATEGY.md` — estrategia y separación semántica de señales.
- `docs/DATA_PROVENANCE_AUDIT.md` — procedencia.
- `docs/KMZ_INTEGRATION.md` — territorialidad/KML.
- `docs/MODULE_I_DATA_READINESS.md` — readiness de datos.

### Documentos históricos o no contractuales

Archivos que describen agentes, experimentos, ML, roadmaps antiguos, arquitectura V2 o capacidades retiradas deben tratarse como referencia histórica salvo que el canon contractual actual los cite explícitamente.

Ejemplos:

- `docs/PRODUCT_ROADMAP.md`;
- `docs/PRESENTATION_ANALYSIS_AGENT.md`;
- `docs/valuation-ml-v1.md`;
- documentos de Pedro Pablo que describan capacidades fuera del runtime contractual actual;
- inventarios de legado y notas de migración.

No eliminarlos si aportan trazabilidad, pero no usarlos como definición de entrega vigente.

## 5. Alcance vigente

Los tres pilares contractuales son:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión y Automatización de Reportes.

El cierre actual mantiene foco operacional en Vitacura y no debe ampliar alcance sólo para mejorar una métrica de cobertura.

El cotizador público referencial es una mejora complementaria ya desplegada. No sustituye el Valorizador Profesional ni forma parte de la aceptación contractual del Pilar II.

## 6. Separaciones que la documentación debe preservar

Toda documentación nueva debe distinguir explícitamente:

- oferta activa vs compraventas confirmadas;
- propiedad canónica vs listing observado;
- observaciones live vs observaciones utilizables para cálculo;
- estimación pública referencial vs valorización profesional;
- dato faltante vs cero;
- regla provisional N3uralia vs definición aprobada por el Cliente;
- PASS técnico vs aceptación UAT;
- dependencia externa vs defecto del producto;
- capability de UI vs autorización real server-side/RLS.

## 7. Política de mantenimiento documental

Cada release material debe actualizar, como mínimo:

1. baseline productivo en este índice;
2. `ROADMAP.md` si cambia el siguiente gate;
3. `docs/TECHNICAL_CLOSURE_RECORD.md` si cambia la evidencia técnica;
4. `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` si cambia el estado de entrega;
5. documentación específica del módulo afectado.

No mantener SHAs antiguos bajo el rótulo “baseline actual”. Si un SHA se conserva por trazabilidad debe etiquetarse como histórico.

Los snapshots de datos deben incluir fecha y aclarar que son observaciones, no invariantes.

## 8. Próximo hito

El siguiente gate de negocio es ejecutar `docs/UAT_PROPERTY_PARTNERS.md` con usuarios autorizados, registrar `PASS`, `FAIL` o `BLOCKED_EXTERNAL`, cerrar cualquier P0/P1 y repetir el gate técnico si el UAT produce cambios de código.

Después corresponde capacitación, acta/minuta de aceptación y congelamiento del baseline final de entrega.