# Guía de inventario del paquete de entrega

## Propósito

Mantener un inventario verificable del contenido que se pretende entregar, sin incluir secretos ni alterar la titularidad de los materiales.

## Estados

- `draft`: inventario aún incompleto.
- `assembled`: contenido reunido, todavía sin validación final.
- `verified`: contenido revisado, checksum calculado y reconstrucción limpia aprobada.
- `delivered`: transferencia autorizada y registrada.

## Reglas

Cada elemento incluido debe indicar sección, ruta, clasificación de propiedad y justificación. Los activos canónicos del Cliente permanecen `client-owned-canonical`; la metodología reutilizable N3uralia no debe incluirse cuando esté clasificada para exclusión.

No se deben incorporar valores de variables de entorno, claves, tokens, cookies, service-role keys, dumps no autorizados, logs sensibles, artefactos locales ni dependencias instaladas.

## Validación

Antes de pasar a `verified` deben existir artefactos de las cinco secciones, checksum SHA-256 y evidencia de reconstrucción en ambiente limpio. Antes de pasar a `delivered` debe existir autorización explícita de entrega.
