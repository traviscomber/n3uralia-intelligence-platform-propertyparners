# Registro de ejecución UAT — 2026-09-01

## Alcance

Este registro corresponde al cierre de entrega V1 definido por `docs/UAT_PROPERTY_PARTNERS.md`:

1. Inteligencia de Mercado.
2. Valorización.
3. Control de Gestión y Automatización de Reportes.
4. Alcance de mercado: ventas de casas en Vitacura.

No convierte funcionalidades V2 ni investigación técnica en requisitos de aceptación.

## Entorno auditado

- Producción: `https://ppartnersgroup.app`
- Baseline productivo: `532126daec82cfdad6f22038781bac27dfdc3c8e`
- Vercel deployment: `dpl_DeEMDDjyGpNEBU2g6cdsaSBYputL`
- Estado del deployment durante auditoría: `READY`
- Supabase: `orfncinmhymhhoxbxgjb`

## Resultado técnico

La ejecución de closeout sobre la rama `qa/delivery-uat-closeout-20260901` completó satisfactoriamente:

- instalación con `pnpm --frozen-lockfile`;
- aceptación técnica: **20/20 verificaciones sin errores**;
- build Next.js de producción;
- regresión Valorizador: **25/25 tests**;
- seguridad de límites IP;
- seguridad de credenciales;
- seguridad de exposición;
- aislamiento multi-tenant: `manualReview=0`, 16 migraciones históricas verificadas;
- verificación de acceso por rutas/capacidades para CEO, admin, director, subdirector y seller;
- Inteligencia de Mercado: identidad, ingestión y compatibilidad contractual;
- Valorización: modelo, workflow, condición y evidencia canónica;
- Control de Gestión: scoring, persistencia, reconciliación, reportes y delivery;
- Reportin PDF canónico;
- trazabilidad documental y de negocio.

## Salud productiva observada

Durante el corte de QA:

- deployment productivo `READY`;
- no se observaron eventos `error` o `fatal` en la ventana runtime consultada de seis horas;
- no se observaron respuestas 5xx para el deployment auditado en la ventana consultada de dos horas.

Esta evidencia demuestra salud puntual; no se presenta como prueba histórica de un SLA de 99,5%.

## Evidencia de datos

### Inteligencia de Mercado

- CBRS integrado: 17.581 transacciones de referencia.
- Barrios canónicos Property Partners: 19 polígonos.
- Refresh V1 de casas Portal observado: ejecuciones recientes completadas con 12 aceptadas y 0 rechazadas.
- El alcance V1 no incluye departamentos ni proyectos.

### Valorización

Estado productivo al corte:

- 10 casos totales.
- 2 `draft`.
- 8 `review`.
- 0 `issued`.

Por lo tanto, la implementación del workflow está técnicamente verificada, pero la aceptación humana de un ciclo productivo completo hasta `issued` **no está ejecutada**. No se emitirá una valorización real sólo para satisfacer QA.

### Control de Gestión

- 7 entidades de gestión en producción.
- Gates de scoring, reconciliación, comparaciones, fuentes, scheduling y delivery pasan.
- El diccionario oficial de KPI sigue siendo dependencia compartida y limita qué métricas pueden presentarse como “oficiales”.

## UAT autenticado por roles

**Estado: HOLD.**

El runner de aceptación verificó que las credenciales/participantes QA autenticados no están configurados en GitHub Actions para CEO, director y oficinas/sellers. Por seguridad:

- no se incorporaron secretos al repositorio;
- no se fabricaron credenciales;
- no se reutilizaron cuentas reales sin autorización;
- las pruebas autenticadas visuales y por rol no se marcaron como PASS.

El HOLD requiere participantes UAT designados y una sesión/ejecución autorizada.

## Defectos encontrados y corregidos durante closeout

1. `package.json` y `pnpm-lock.yaml` estaban desincronizados; lockfile regenerado y frozen install validado.
2. Un conflicto de barrio podía conservar confianza `candidate_high` en identidad de mercado; ahora queda limitado a `candidate_medium` y una contradicción de ROL sigue siendo rechazo.
3. El test de ingestión buscaba texto de una UI antigua; fue alineado a la superficie de estado realmente desplegada.
4. Dos endpoints devolvían mensajes internos crudos; fueron sanitizados para responder mensajes genéricos y mantener detalle sólo en logs de servidor.
5. El auditor multi-tenant marcaba una migración histórica cuyo estado efectivo ya fue endurecido; se verificó la política RLS productiva y se registró esa evidencia histórica sin debilitar el auditor.
6. El runner visual fue actualizado a `puppeteer-core` + `@sparticuz/chromium`, consistente con el runtime serverless actual.

## Estado por caso

| Caso | Estado | Motivo |
|---|---|---|
| UAT-01 Accesos y permisos | HOLD | Técnica verde; falta ejecución autenticada con participantes designados. |
| UAT-02 Dashboard CEO | HOLD | Técnica verde; falta aceptación visual/de negocio CEO. |
| UAT-03 Control/CRM comercial | HOLD | Técnica verde; falta diccionario KPI y aceptación de negocio. |
| UAT-04 Inteligencia de Mercado | HOLD | KML/CBRS ya entregados e integrados; falta aceptación autenticada de negocio. |
| UAT-05 Valorización | HOLD | Técnica y regresión verdes; falta ciclo real autorizado hasta `issued`. |
| UAT-06 Reporting | HOLD | Técnica verde; faltan calendario/destinatarios/reglas aprobadas. |
| UAT-07 Seguridad funcional | PASS | Gates de límites y RLS/tenant verdes. |
| UAT-08 Continuidad operativa | PASS | Producción READY, build verde y ventana runtime sin errores observados. |

## Veredicto Qalito de esta ejecución

**HOLD para aceptación contractual final.**

Motivo: no hay un P0/P1 técnico abierto identificado en este closeout, pero los flujos primarios que requieren identidad humana/autorización del Cliente no han sido aceptados aún. El producto está en condición **ready-for-UAT**, no en condición de “aceptado por el Cliente”.

## Siguiente cierre

Antes de firma final:

1. designar participantes UAT;
2. ejecutar accesos por rol y revisar dashboards;
3. llevar un caso real autorizado de Valorizador hasta `issued`;
4. aprobar KPI oficiales y reglas de reporting;
5. completar manuales/handover;
6. ejecutar capacitación y registrar aceptación.
