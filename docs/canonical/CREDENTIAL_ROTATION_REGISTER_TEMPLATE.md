# Registro de rotación de credenciales

## Regla

Este registro nunca debe contener tokens, contraseñas, claves privadas ni valores secretos. Sólo registra identificadores, responsables, fechas y evidencia de ejecución.

## Inventario

| Servicio | Credencial o variable | Ambiente | Responsable | Motivo | Fecha programada | Fecha ejecutada | Validación posterior | Estado |
|---|---|---|---|---|---|---|---|---|
| [COMPLETAR] | [NOMBRE SIN VALOR] | [production/preview/development] | [COMPLETAR] | [traspaso/incidente/ciclo] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | pending |

## Procedimiento mínimo

1. confirmar autorización y ventana de cambio;
2. generar la nueva credencial en el proveedor correspondiente;
3. actualizarla mediante el canal seguro del proveedor;
4. validar build, deployment y operación crítica;
5. revocar la credencial anterior;
6. registrar evidencia sin revelar el valor;
7. ejecutar rollback si la validación falla.

## Controles

- separación entre quien genera, aplica y valida cuando sea posible;
- mínimo privilegio;
- MFA en cuentas administrativas;
- no reutilización entre ambientes;
- ausencia de secretos en Git, documentos, logs y comentarios;
- revisión de variables públicas `NEXT_PUBLIC_*`;
- notificación de incidentes cuando exista exposición confirmada.

## Cierre

Una rotación sólo queda `completed` cuando la credencial anterior fue revocada y la nueva fue validada en el ambiente correspondiente.