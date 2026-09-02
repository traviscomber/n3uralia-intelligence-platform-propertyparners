# Registro de cierre técnico — Property Partners

Fecha de actualización: 2 de septiembre de 2026

## 1. Alcance del cierre

Este documento consolida el estado técnico verificable de la plataforma sobre el baseline productivo actual.

El cierre técnico y la aceptación contractual son gates distintos. Este documento puede declarar PASS técnico, pero no declara UAT del Cliente completado ni aceptación comercial final.

## 2. Baseline productivo validado

- repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`;
- rama: `main`;
- producción: `https://ppartnersgroup.app`;
- commit productivo: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- Vercel deployment: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- deployment: `READY`;
- aliases productivos incluyen `ppartnersgroup.app`;
- verificación visual: desktop PASS, móvil estrecho PASS.

## 3. Gates de release

Sobre el candidato que produjo el baseline actual se verificó:

- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS;
- Vercel preview: `READY`;
- runtime del preview en la ventana final: sin warnings/errors/fatal observados;
- QA visual pública: PASS;
- QA visual autenticada: PASS;
- QA responsive móvil: PASS;
- PR mergeable antes del merge;
- merge controlado con head exacto validado.

El merge resultante produjo el commit productivo indicado en la sección anterior y su deployment quedó `READY`.

## 4. Estado técnico de los tres pilares

### Pilar I — Inteligencia de Mercado — PASS

Verificado:

- fuentes y observaciones con procedencia;
- oferta activa separada de compraventas CBRS;
- territorialidad KML de Vitacura;
- listing observado separado de property canónica;
- cola de revisión live separada de revisión histórica property ↔ property;
- CTAs operativos alineados a la cola live;
- métricas de oferta con semántica explícita;
- UF/m² construido derivado correctamente para casas cuando corresponde;
- estados de frescura, cobertura y ausencia de evidencia sin completar con valores inventados.

Snapshot auditado el 2 de septiembre de 2026:

- 44 casas activas;
- 44/44 con barrio KML resoluble;
- 41/44 utilizables para UF/m² construido.

### Pilar II — Valorización de Propiedades — PASS

Verificado:

- identificación de sujeto;
- comparables trazables;
- mínimo de tres comparables seleccionados por humano;
- cálculo determinístico;
- workflow de revisión/devolución/corrección/reenvío;
- aprobación CEO con MFA/AAL2;
- snapshots/versiones e integridad;
- emisión y PDF desde el snapshot emitido;
- historial y decisiones auditables.

### Pilar III — Control de Gestión y Reportes — PASS técnico

Verificado:

- scopes por rol;
- métricas persistidas y reconciliación;
- tareas y seguimiento;
- reportes desde snapshots;
- delivery trazable;
- retries e idempotencia;
- scheduling protegido;
- comportamiento fail-closed cuando faltan definiciones oficiales.

La activación de recurrencia definitiva continúa condicionada por información de negocio que N3uralia no debe inventar.

## 5. Mejora complementaria pública — productiva

El cotizador público para casas en Vitacura ya no es un candidato de preview.

PR #183 fue mergeado y forma parte del baseline productivo actual.

Estado verificado:

- 19 sectores KML seleccionables;
- referencia sectorial sólo con >=5 observaciones utilizables;
- fallback explícito a referencia general de Vitacura bajo ese piso;
- 41 observaciones utilizables en el snapshot de auditoría;
- Santa María 12, La Llavería 7 y Club de Polo 6 con nivel sectorial en ese snapshot;
- dormitorios/baños no degradan una muestra válida cuando su cobertura es insuficiente;
- endpoint público expone agregados, no listings crudos;
- no solicita ni persiste datos personales;
- responsive y mobile verificados;
- dashboard autenticado permanece aislado.

Detalle: `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.

Esta mejora no reemplaza el Valorizador Profesional y no constituye UAT del Pilar II.

## 6. Seguridad y aislamiento

La arquitectura de seguridad mantiene:

- autorización server-side por capability;
- scope global/oficina/personal;
- RLS autenticada;
- operaciones privilegiadas server-only;
- aprobación/emisión protegida por rol y MFA/AAL2;
- separación entre visibilidad de UI y autoridad real;
- límites de propiedad intelectual N3uralia verificados por gate automatizado.

No se considera suficiente ocultar un control en UI para declarar una operación protegida.

## 7. Pendientes externos al cierre técnico

### UAT / aceptación

Pendiente ejecutar `docs/UAT_PROPERTY_PARTNERS.md` con usuarios autorizados para:

- suficiencia operacional de Mercado;
- nomenclatura/filtros/barrios;
- caso real completo de Valorización;
- revisión de PDFs reales;
- visibilidad y lectura por rol;
- resultado por pilar.

### Definiciones de negocio

Continúan externas hasta aprobación formal:

- diccionario KPI;
- metas/umbrales/ranking;
- calendario y destinatarios de reportes;
- reglas definitivas de recurrencia;
- nuevas fuentes o políticas adicionales si el Cliente las requiere.

Una dependencia externa no debe registrarse como defecto del producto ni sustituirse por fixtures para simular cierre.

## 8. Criterio de cierre técnico

**Resultado: PASS técnico.**

Se sustenta en que:

1. los tres pilares tienen gates técnicos críticos verdes;
2. el baseline exacto está identificado;
3. producción está `READY`;
4. la QA visual afectada fue ejecutada en desktop y móvil;
5. no existe un P0/P1 técnico conocido en el alcance verificado;
6. las dependencias externas permanecen explícitas y fail-closed donde corresponde;
7. los cambios complementarios del cotizador están productivos y separados del criterio UAT contractual.

## 9. Siguiente gate

Ejecutar UAT de Property Partners.

Si el UAT produce cambios de código:

1. corregir;
2. repetir CI/IP boundaries/preview/runtime/QA afectada;
3. desplegar sólo con gate PASS;
4. actualizar este documento con el nuevo baseline;
5. congelar el release final después de aceptación.