# Property Partners — Cierre de entrega

Última actualización: 18 de septiembre de 2026.

## Estado

**READY PARA CIERRE / UAT CLIENTE.**

Release candidate productivo:

- SHA: `4b23ce001c1f870f7dd4c744ae79b6937a75e396`
- Producción: `https://ppartnersgroup.app`
- Deployment: `dpl_99TNS7C8Wf6uY8MyxtjqoYXh38h6` — READY
- Runtime posterior al deploy: sin errores observados en la ventana auditada
- Tres pilares contractuales: PASS técnico

Este documento no declara aceptación del Cliente. Separa lo que ya está validado técnicamente de las pocas decisiones que corresponde validar a Property Partners.

## Qué debe validar Pedro Pablo

La UAT ejecutiva debe ser breve. Pedro Pablo valida negocio y criterio, no funcionamiento interno del software.

1. **Hoy** — que la portada muestre lo importante para dirigir la operación.
2. **Mercado Vitacura** — que la lectura de mercado, fuentes y contexto resulte útil y coherente para Property Partners.
3. **Una valorización real** — revisar comparables y llevar un caso representativo hasta aprobación/emisión.
4. **Gestión** — confirmar que prioridades, cifras e informes corresponden a la forma en que quiere gestionar.

No se solicita a Pedro Pablo validar RLS, APIs, migraciones, deduplicación técnica, CI, seguridad interna, cálculos automatizados ni registros uno a uno.

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

La automatización de identidad de alta confianza aplicada en base de datos reduce revisión manual, pero el PR #208 permanece **HOLD** hasta cerrar el conflicto P1 detectado sobre evidencia de identidad externa. No forma parte del release candidate de código.

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

El hardening productivo de funciones `SECURITY DEFINER` ya fue aplicado en Supabase: ejecución `anon` y `PUBLIC` cerrada. PR #207 permanece abierto porque su gate de prevención futura recibió una observación P2 y debe corregirse antes de integrarlo al repositorio. El estado productivo de seguridad no depende de mergear ese PR.

Pendientes administrativos/técnicos de cierre:

- habilitar Leaked Password Protection en Supabase Auth;
- registrar restore drill / evidencia vigente de backup-recovery.

## Criterio de cierre

Para declarar la entrega aceptada:

- UAT ejecutiva de los cuatro puntos anteriores;
- P0 = 0 y P1 = 0;
- una valorización real hasta `issued`;
- inspección humana del PDF;
- capacitación/entrega operativa registrada;
- restore drill registrado;
- KPI/reporting pendientes documentados como aprobados o dependencia cliente;
- congelar SHA final;
- registrar aceptación del Cliente.

## Regla de congelamiento

Desde este punto no se agregan features al release de entrega. Sólo se aceptan:

- correcciones P0/P1;
- correcciones necesarias para completar UAT;
- documentación de cierre;
- hardening que no altere el alcance funcional.

Todo cambio de código posterior obliga a repetir los gates técnicos correspondientes antes de mover el SHA final.

## Pendientes de ingeniería fuera del release candidate

- **PR #207 — HOLD:** hardening reproducible; corregir gate para inspeccionar migraciones futuras/estado efectivo y resolver P2.
- **PR #208 — HOLD:** auto-resolución de identidad; incorporar evidencia externa a la detección de ambigüedad antes de mergear. Tiene observación P1.
- No presentar ninguno de estos PR abiertos como parte del SHA de entrega hasta resolverlos y repetir QA.

## Acta mínima de UAT

| Punto | Resultado | Observación |
|---|---|---|
| Hoy / lectura ejecutiva | PENDIENTE | |
| Mercado Vitacura | PENDIENTE | |
| Valorización real + PDF | PENDIENTE | |
| Gestión / informes | PENDIENTE | |

Resultados permitidos: `PASS`, `FAIL`, `BLOCKED_EXTERNAL`.

## Aceptación

**SHA final:** ____________________

**Fecha:** ____________________

**Representante Property Partners:** ____________________

**Resultado:** ☐ Aceptado  ☐ Aceptado con observaciones  ☐ Requiere correcciones

**Observaciones:**


**Firma / registro de aceptación:** ____________________
