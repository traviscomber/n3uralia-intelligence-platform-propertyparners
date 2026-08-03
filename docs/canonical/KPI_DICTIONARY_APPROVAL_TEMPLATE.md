# Plantilla de aprobación del diccionario de KPI

## Objetivo

Definir y aprobar cada indicador contractual sin mezclar reglas confirmadas por el Cliente con inferencias o convenciones técnicas.

## Registro por KPI

Para cada indicador registrar:

- nombre oficial;
- descripción de negocio;
- fórmula;
- numerador y denominador;
- unidad;
- fuente de datos;
- frecuencia de actualización;
- período de corte;
- dimensiones y filtros permitidos;
- tratamiento de nulos, duplicados y anulaciones;
- responsable funcional;
- responsable técnico;
- estado de aprobación;
- fecha de vigencia.

## Estados permitidos

- `draft`;
- `pending-client-definition`;
- `approved`;
- `deprecated`.

## Reglas

- Un KPI no puede presentarse como definitivo mientras su estado no sea `approved`.
- Toda modificación debe registrar versión, fecha y responsable.
- Los KPI dependientes de CBR, ventas recientes, KML u otras fuentes pendientes deben quedar como `pending-client-definition`.
- Las transformaciones técnicas no modifican la titularidad de las reglas de negocio del Cliente.

## Aprobación

- Representante del Cliente: [COMPLETAR]
- Representante de N3uralia: [COMPLETAR]
- Fecha: [COMPLETAR]
- Versión aprobada: [COMPLETAR]
- Observaciones: [COMPLETAR]
