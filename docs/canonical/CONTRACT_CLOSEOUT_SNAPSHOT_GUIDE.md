# Guía del snapshot de cierre contractual

## Objetivo

Concentrar en una sola vista el estado comprobable del cierre, sin sustituir los registros fuente.

## Fuentes obligatorias

El snapshot debe permanecer consistente con:

- estado contractual;
- preparación para producción;
- aceptación del Cliente;
- ejecución UAT;
- capacitación;
- inventario del paquete final;
- dependencias del Cliente;
- hallazgos críticos y altos.

## Regla de cierre

`contractStatus: closed` sólo es válido cuando:

- existe aceptación expresa del Cliente;
- producción está `ready`;
- UAT está aceptada;
- capacitación está completada o formalmente renunciada;
- paquete final está listo;
- no existen hallazgos críticos o altos;
- commit y deployment HTTPS están identificados.

Este documento es un control de consistencia. No constituye por sí mismo aceptación ni modifica la propiedad de los materiales.
