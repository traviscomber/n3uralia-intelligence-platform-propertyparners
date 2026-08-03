# Runbook de soporte e incidentes

## Objetivo

Definir un proceso reproducible para registrar, clasificar, contener, corregir y cerrar incidentes de la plataforma.

## Severidades

- `critical`: exposición de datos, acceso no autorizado, pérdida de disponibilidad general o riesgo de integridad.
- `high`: función contractual principal indisponible sin alternativa razonable.
- `medium`: degradación con alternativa operativa.
- `low`: defecto menor, visual o documental.

## Flujo

1. Registrar fecha, reportante, ambiente, ruta y síntoma.
2. Preservar evidencia sin copiar secretos ni datos personales innecesarios.
3. Clasificar severidad e impacto.
4. Contener el riesgo.
5. Identificar responsable técnico y funcional.
6. Aplicar corrección con rollback disponible.
7. Validar build, deployment y rutas afectadas.
8. Documentar causa raíz y acciones preventivas.
9. Obtener confirmación de cierre.

## Escalamiento

- Seguridad o datos: escalamiento inmediato a responsable técnico y sponsor.
- Disponibilidad crítica: priorizar restauración segura antes de mejoras.
- Incidentes de terceros: registrar proveedor, ticket, impacto y dependencia.

## Registro mínimo

- identificador;
- severidad;
- estado;
- responsable;
- commit y deployment relacionados;
- causa raíz;
- corrección;
- evidencia de validación;
- fecha de cierre.
