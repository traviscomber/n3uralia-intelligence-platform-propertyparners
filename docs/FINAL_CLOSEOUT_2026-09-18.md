# Property Partners — Cierre de entrega

Última actualización: 18 de septiembre de 2026.

## Estado

**READY PARA CIERRE / UAT CLIENTE.**

Baseline técnico/productivo de cierre (los commits posteriores de este PR sólo actualizan documentación/manifests):

- SHA: `cde1981f32bc7ad95a439897dbb74bf09148c0b5`
- Producción: `https://ppartnersgroup.app`
- Deployment: `dpl_GUg6TPPYJ8oLAcr1VTYakAFcDdaU` — READY
- Runtime posterior al deploy actual: sin errores observados en la ventana auditada; crons productivos verificados en HTTP 200
- Tres pilares contractuales: PASS técnico

Este documento no declara aceptación del Cliente. Separa lo que ya está validado técnicamente de las pocas decisiones que corresponde validar a Property Partners.

## Qué debe validar Pedro Pablo

Pedro Pablo es el **último eslabón de la cadena y el validador final de negocio de Property Partners**.

La cadena de trabajo es:

**Ejecutivo → Director → Pedro Pablo (CEO / validación final).**

N3uralia valida funcionamiento técnico, seguridad, trazabilidad, permisos, datos, CI y regresión. Ejecutivo y Director preparan y revisan la operación. Pedro Pablo recibe el resultado consolidado y valida si representa correctamente el criterio de negocio de Property Partners.

El criterio de **Business Intelligence / Gestión fue definido por Pedro Pablo**; por eso su validación final de esa capa es canónica.

Los siguientes cuatro puntos son los checkpoints ejecutivos desde los que Pedro Pablo valida el resultado completo:

1. **Hoy** — que la portada muestre lo importante para dirigir la operación.
2. **Mercado Vitacura** — que fuentes, lectura y conclusiones sean correctas para Property Partners.
3. **Valorización real** — que el expediente completo, comparables, fundamento, valor/rango y PDF final sean utilizables frente a un cliente.
4. **Business Intelligence / Gestión** — que prioridades, métricas, rankings, alertas, informes y automatizaciones correspondan al criterio que él definió.

Pedro Pablo valida **el resultado completo de negocio**, no sólo estos cuatro screens. No se le pide repetir QA técnica ni revisar RLS, APIs, migraciones, logs o detalles internos que son responsabilidad de N3uralia.

## Experiencia ejecutiva

La vista CEO queda deliberadamente reducida a:

- Hoy
- Mercado
- Valorizaciones
- Gestión
- Propiedades
- Informes

La portada muestra resultado actual, métricas esenciales y hasta tres prioridades accionables. Metodología, gobernanza, administración técnica y explicaciones internas no compiten con la decisión ejecutiva.

## Estado por pilar

### 1. Inteligencia de Mercado

**PASS técnico / READY UAT.**

Portal Inmobiliario, CBRS Vitacura y KML se mantienen como fuentes separadas y trazables. Una publicación no se considera venta confirmada. Una fila CBRS no se convierte automáticamente en comparable sin controles de identidad y comparabilidad.

La automatización de identidad de alta confianza está integrada mediante el PR #211. El PR #208 quedó supersedido. La auto-resolución sólo opera ante match único, score alto y ausencia de evidencia externa ambigua o contradictoria; los demás casos siguen en revisión humana.

### 2. Valorización

**PASS técnico / READY UAT.**

Expediente, comparables, ajustes, devolución/reenvío, versiones, decision log, aprobación CEO con MFA/AAL2, emisión y PDF están implementados.

Gate de cliente: ejecutar un caso real representativo hasta `issued` e inspeccionar el PDF final.

### 3. Gestión y Reportes

**PASS técnico / READY UAT.**

Vistas por rol, métricas, tareas, seguimiento, reportes y entrega protegida están disponibles. La recurrencia permanece fail-closed mientras Property Partners no defina formalmente KPI, metas, umbrales, calendario o destinatarios pendientes.

## Asistente Pedro Pablo

El asistente incorpora criterio Senior Real Estate para Vitacura, trabaja sobre evidencia y mantiene separación entre hechos canónicos, evidencia de mercado e interpretación profesional.

Debe reconocer falta de información en vez de inventar precisión. Las preguntas siguientes se adaptan al contexto. El especialista es invisible para mantener la experiencia ejecutiva simple.

## Seguridad

Autenticación, autorización por rol, tenant isolation y MFA/AAL2 para operaciones críticas forman parte del gate técnico.

El hardening de funciones `SECURITY DEFINER` está integrado mediante el PR #207: ejecución `anon` y `PUBLIC` cerrada y gate preventivo activo para migraciones futuras. Los RPC autenticados intencionales conservan controles internos de identidad, rol y alcance.

Pendientes administrativos/técnicos de cierre:

- habilitar Leaked Password Protection en Supabase Auth;
- registrar restore drill / evidencia vigente de backup-recovery.

## Criterio de cierre

Para declarar la entrega aceptada:

- ejecución operativa de los casos READY por Ejecutivo/Director y validación final de negocio por Pedro Pablo;
- ejecución y registro de los casos canónicos READY de `docs/UAT_PROPERTY_PARTNERS.md` con CEO, Director y Ejecutivo;
- `config/uat-case-status.json` sin casos bloqueantes pendientes salvo dependencias externas explícitamente aceptadas;
- P0 = 0 y P1 = 0;
- una valorización real hasta `issued`, incluyendo devolución por Director, corrección/reenvío por Ejecutivo y aprobación/emisión CEO con AAL2;
- inspección humana del PDF;
- capacitación realizada o renunciada formalmente;
- restore drill registrado;
- KPI/reporting pendientes documentados como aprobados o dependencia cliente;
- paquete final generado e inspeccionado;
- reconstrucción en ambiente limpio completada;
- checksum SHA-256 registrado;
- variables documentadas por nombre, sin valores;
- titularidad/costos de terceros y receptor técnico definidos;
- autorización de entrega registrada;
- congelar SHA y deployment final;
- registrar aceptación del Cliente.

La lista completa y vinculante de cierre sigue siendo `docs/canonical/FINAL_CLOSEOUT_CHECKLIST.md`.

## Regla de congelamiento

Desde este punto no se agregan features al release de entrega. Sólo se aceptan:

- correcciones P0/P1;
- correcciones necesarias para completar UAT;
- documentación de cierre;
- hardening que no altere el alcance funcional.

Todo cambio de código posterior obliga a repetir los gates técnicos correspondientes antes de mover el SHA final.

## Ingeniería cerrada para este release

- **PR #207 integrado:** hardening reproducible de SECURITY DEFINER y gate sobre migraciones futuras.
- **PR #211 integrado:** auto-resolución de identidad de alta confianza con bloqueo explícito ante evidencia externa ambigua o contradictoria.
- **PR #213 integrado:** QA autenticada y visual mantienen sus pasos de prueba obligatorios; la carga de artefactos queda best-effort para no convertir la cuota de almacenamiento de GitHub en un falso fallo de QA.
- El único caso auto-confirmado en producción fue auditado: la evidencia externa apunta a la misma propiedad canónica.
- No quedan P0/P1 técnicos conocidos abiertos en estos dos frentes.

## Acta mínima de UAT

| Punto de validación final Pedro Pablo | Resultado | Observación |
|---|---|---|
| Hoy / lectura ejecutiva | PENDIENTE | |
| Mercado Vitacura | PENDIENTE | |
| Valorización real + PDF | PENDIENTE | |
| Business Intelligence / Gestión / informes | PENDIENTE | |
| Aceptación final de negocio punta a punta | PENDIENTE | |

Resultados permitidos: `PASS`, `FAIL`, `BLOCKED_EXTERNAL`.

## Aceptación

**SHA final:** ____________________

**Deployment aceptado (HTTPS):** ____________________

**Fecha:** ____________________

**Representante Property Partners:** ____________________

**Representante N3uralia:** ____________________

**Resultado:** ☐ Aceptado  ☐ Aceptado con observaciones  ☐ Requiere correcciones

**Observaciones:**


**Firma / registro de aceptación:** ____________________
