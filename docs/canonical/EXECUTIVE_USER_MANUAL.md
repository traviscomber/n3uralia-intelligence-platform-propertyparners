# Manual ejecutivo de uso — Property Partners Intelligence Platform

**Versión de entrega:** 2026-09-01  
**Producción:** `https://ppartnersgroup.app`  
**Alcance V1:** Inteligencia de Mercado, Valorización y Control de Gestión / Automatización de Reportes para ventas de casas en Vitacura.

## 1. Para qué sirve la plataforma

La plataforma concentra tres decisiones operativas:

1. **Entender el mercado** con evidencia territorial, Portal Inmobiliario y transacciones CBRS.
2. **Valorar una propiedad** mediante comparables, condición, evidencia trazable y revisión humana.
3. **Gestionar el negocio** mediante dashboards por rol, métricas, alertas y reportes.

La plataforma separa hechos persistidos, evidencia documental e inferencias. Un dato `n/d`, pendiente o no reconciliado no debe interpretarse como cero ni como hecho aprobado.

## 2. Acceso y roles

Roles vigentes:

- **CEO / admin:** visión global y operaciones ejecutivas autorizadas.
- **Director / subdirector:** alcance de su oficina y equipo.
- **Seller / ejecutivo:** alcance propio.

Si un usuario ve otra oficina, otro equipo o una valorización fuera de su alcance debe detener la operación y reportarlo como incidente de autorización.

## 3. Dashboard ejecutivo

La vista CEO resume desempeño, oficinas, riesgos, pendientes y actividad relevante.

Uso recomendado:

1. confirmar período visible;
2. revisar fuente/metodología de cada indicador;
3. separar métricas aprobadas de métricas provisionales o derivadas;
4. revisar alertas y pendientes antes de tomar una acción;
5. no presentar como KPI oficial una métrica cuyo diccionario aún no haya sido aprobado por Property Partners.

El diccionario final de KPI sigue siendo una dependencia compartida de cierre.

## 4. Inteligencia de Mercado V1

Ruta principal: `/dashboard/market`.

Fuentes canónicas integradas al corte de entrega:

- **CBRS:** transacciones de referencia.
- **Property Partners KML:** barrios/polígonos territoriales.
- **Portal Inmobiliario:** casas en venta en Vitacura mediante refresh operacional V1.

### Regla de alcance

Departamentos y proyectos no forman parte del alcance operativo V1 de aceptación. Se consideran V2 y no bloquean esta entrega.

### Cómo interpretar la información

- verificar siempre fecha/corte y cobertura;
- una identidad candidata no equivale a propiedad confirmada;
- discrepancias de ROL se rechazan;
- conflictos de barrio reducen la confianza de reconciliación;
- PRC, jerarquía vial y otras capas de investigación son evidencia contextual/no vinculante salvo que el producto indique lo contrario;
- la inteligencia de mercado no modifica automáticamente los pesos oficiales del modelo de valorización.

## 5. Valorizador

Ruta principal: `/dashboard/valuation`.

### Flujo de negocio

1. crear expediente y completar atributos de la propiedad;
2. revisar condición, ubicación y evidencia disponible;
3. seleccionar **mínimo 3 comparables aceptados**;
4. documentar inclusiones/exclusiones y justificación;
5. guardar/enviar a revisión;
6. reviewer/director revisa y puede devolver observaciones según su alcance;
7. el expediente corregido vuelve a revisión;
8. **la aprobación/emisión final corresponde al CEO autorizado**;
9. una versión `issued` queda congelada como snapshot trazable.

### Estados principales

- `draft`: expediente en preparación;
- `review`: listo/en proceso de revisión;
- `approved`: aprobación autorizada previa a emisión cuando corresponda al workflow;
- `issued`: versión emitida e inmutable para efectos de reporte/auditoría.

No usar un caso en `draft` o `review` como informe final emitido.

### Principio de uso

El valor es una decisión asistida por evidencia y revisión profesional; no debe presentarse como tasación legal o certeza automática.

## 6. Control de Gestión

El sistema consolida entidades, oficina/equipo, métricas, metas, alertas y reportes dentro del alcance autorizado.

Antes de usar una métrica para evaluación formal:

- confirmar período;
- confirmar procedencia;
- confirmar que la definición KPI fue aprobada;
- revisar conciliación/calidad;
- distinguir valor aprobado de indicador provisional.

## 7. Reportes

La plataforma permite generación, preview, programación y trazabilidad de reportes.

Antes de activar una distribución recurrente deben aprobarse:

- calendario;
- destinatarios;
- frecuencia;
- formato/canal;
- responsable de revisión.

Un estado `pending` no prueba que un correo haya sido entregado.

## 8. Qué no debe hacerse

- compartir credenciales;
- aprobar datos o KPI no confirmados como si fueran oficiales;
- alterar manualmente un snapshot emitido y presentarlo como generado por la plataforma;
- usar una propiedad candidata/no reconciliada como identidad confirmada;
- emitir una valorización sin el workflow autorizado;
- copiar secretos, tokens o service-role keys a chats, correos o documentos de entrega.

## 9. Qué hacer ante un problema

Registrar:

- fecha/hora;
- usuario y rol, sin contraseña;
- URL/ruta;
- acción realizada;
- mensaje visible;
- ID de caso/reporte/importación cuando exista;
- captura sin datos sensibles innecesarios.

Seguir `docs/canonical/SUPPORT_AND_INCIDENT_RUNBOOK.md`.

## 10. Estado de aceptación

La plataforma está técnicamente en condición **ready-for-UAT**. La aceptación final requiere todavía:

- prueba autenticada con participantes designados;
- un ciclo real autorizado de Valorizador hasta `issued`;
- aprobación del diccionario KPI y reglas de reporting;
- capacitación/handover;
- registro de aceptación del Cliente.

Este manual no sustituye esos actos de aceptación.
