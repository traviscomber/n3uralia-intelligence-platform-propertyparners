# Guía de preparación para producción

## Propósito

Separar el estado técnico de producción de la aceptación contractual del Cliente.

## Condición `ready`

Sólo puede declararse cuando exista evidencia para:

- build exitoso;
- límites de seguridad e inteligencia protegida;
- aislamiento por tenant;
- configuración de runtime;
- rollback documentado;
- monitoreo y respuesta operativa;
- respaldo y recuperación;
- rutas críticas verificadas.

Además, no pueden existir hallazgos críticos o altos abiertos.

## Estados

- `in-review`: controles todavía pendientes o en validación.
- `ready`: todos los controles obligatorios aprobados.
- `blocked`: existe un bloqueo técnico o externo identificado.

Un deployment verde es evidencia necesaria, pero no suficiente para declarar `ready`.
