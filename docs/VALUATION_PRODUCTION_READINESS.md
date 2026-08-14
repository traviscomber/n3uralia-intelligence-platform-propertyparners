# Valorización — readiness de producción

Última actualización: 6 de agosto de 2026

## Objetivo

Definir cuándo puede ejecutarse una valorización real sin introducir fixtures, mocks, datos demo ni inferencias presentadas como evidencia.

## Estado técnico

El módulo dispone de:

- expediente persistido;
- propiedad sujeto y evidencia de origen;
- comparables candidatos, aceptación y exclusión;
- ajustes con límites;
- estimación, rango y confianza;
- workflow atómico de revisión, devolución, aprobación y emisión;
- aprobación/emisión exclusiva CEO;
- MFA/AAL2 en operaciones críticas;
- versiones y decision log;
- reporte imprimible/PDF;
- restricciones que impiden avanzar sin evidencia mínima.

## Gate de datos reales

Una ejecución productiva requiere, como mínimo:

1. propiedad sujeto real e identificable;
2. identidad canónica confirmada cuando corresponda;
3. al menos tres comparables aceptables y trazables;
4. precios/fechas/atributos de comparables sustentados por fuentes válidas;
5. datos suficientes para explicar ajustes y rango;
6. revisión humana antes de aprobación y emisión.

## Estado actual de producción

Al 6 de agosto de 2026:

- casos de valorización: `0`;
- comparables de valorización: `0`;
- transacciones canónicas confirmadas: `0`;
- propiedades con identidad confirmada: `0`;
- propiedades de mercado almacenadas: `837`.

Por lo tanto, el módulo está **técnicamente preparado pero bloqueado para una valorización real por ausencia de evidencia canónica suficiente**.

## Regla de integridad

No se debe crear una valorización QA ficticia en producción para demostrar cierre contractual. El primer caso end-to-end debe originarse en una propiedad y evidencia reales.

La ausencia de datos reales es una dependencia de fuente, no un defecto del motor de valorización.
