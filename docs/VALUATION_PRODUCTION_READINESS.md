# Valorización — readiness de producción

Última actualización: 24 de septiembre de 2026

## Objetivo

Definir cuándo puede ejecutarse y emitirse una valorización real sin fixtures, mocks, datos demo ni inferencias presentadas como evidencia.

## Autoridad canónica

Metodología: `property-partners-valuation-v2`.

Fuentes primarias:
- `Plantilla de Valorización Casas.xlsx`
- `Plantilla de Valorización Departamentos.xlsx`
- CBRS Vitacura canónico 2014–2026
- snapshots Portal de referencia Property Partners
- `Barrios Vitacura.kml`

Registro de autoridad: `data/canonical/valuation-intelligence.json`.

## Estado técnico

El módulo dispone de:

- expediente persistido;
- propiedad sujeto y evidencia de origen;
- comparables candidatos, aceptación y exclusión;
- cálculo canónico Casa/Departamento;
- escenarios de publicación 0/5/10;
- factores cualitativos conservados como evidencia de revisión;
- estimación, rango y confianza;
- workflow atómico de revisión, devolución, aprobación y emisión;
- aprobación/emisión exclusiva CEO;
- MFA/AAL2 en operaciones críticas;
- versiones y decision log;
- reporte imprimible/PDF;
- restricciones que impiden avanzar sin evidencia mínima;
- issued snapshots inmutables.

## Gate de datos reales

Una valorización productiva requiere, como mínimo:

1. propiedad sujeto real e identificable;
2. identidad/territorio canónico confirmado cuando corresponda;
3. al menos **3 comparables seleccionados y calculables**;
4. precios, superficies, fechas y fuentes trazables;
5. reglas de superficie correctas por tipo/fuente;
6. revisión humana de estado, contradicciones y evidencia;
7. aprobación CEO/AAL2 antes de emisión.

Normalmente se trabaja con hasta 5 comparables. Más de 5 requiere justificación explícita.

## Estado de evidencia observado

Lectura read-only del sistema al 24-09-2026:

- casos de valorización persistidos: **10**;
- comparables persistidos: **62**;
- comparables seleccionados: **44**;
- casos draft: **2**;
- casos en review: **8**;
- casos aprobados: **0**;
- casos emitidos: **0**;
- transacciones residenciales CBRS canónicas: **17.581**;
- barrios oficiales PP en la fuente KML: **19**.

El sistema ya no está bloqueado por ausencia absoluta de evidencia. El gate pendiente es distinto: **ningún expediente ha completado todavía aprobación y emisión canónica**.

## Portal de referencia

Los snapshots Property Partners son evidencia de benchmark, no inventario vivo:

- casas: 1.731;
- departamentos: 3.440 válidos;
- proyectos: 26.

Los counts pueden estar materializados como métricas aun cuando no todas las filas estén presentes en la tabla operacional de referencia. No sustituir esos benchmarks por capturas live parciales.

## Factores cualitativos

La tabla `valuation_adjustment_catalog` contiene límites operativos para condición, remodelación, orientación, piso, luz, vista, ruido y potencial comercial.

Esos límites **no constituyen una fórmula económica canónica aprobada**.

En metodología v2:
- se registran como evidencia/revisión;
- no modifican automáticamente el valor comercial;
- cualquier decisión humana relacionada debe quedar justificada y trazable.

## Inteligencia avanzada

Existen capas de ML/shadow, PRC, topografía, jerarquía vial, regime routing y revisión profesional.

Estado semántico:
- pueden informar revisión/confianza;
- no son propietarias del valor canónico v2;
- no pueden sustituir silenciosamente las fórmulas de las plantillas.

## Regla de integridad

No crear ni emitir una valorización ficticia para demostrar cierre contractual.

Una valorización real sólo puede emitirse desde evidencia real, con fuentes trazables, muestra mínima, revisión humana y aprobación correspondiente.

La existencia de modelos avanzados no elimina este gate.
