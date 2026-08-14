# Guía de estado de aceptación del Cliente

## Objetivo

Mantener una única fuente verificable para la aceptación contractual, sin inferir aprobación por avance técnico.

## Estados

- `pending`: no existe aceptación formal suficiente.
- `accepted`: aceptación completa, sin observaciones abiertas.
- `accepted-with-observations`: aceptación expresa con pendientes identificados y responsables.
- `rejected`: rechazo formal con evidencia y causas registradas.

## Evidencia mínima

Todo estado distinto de `pending` exige:

- commit exacto aceptado;
- deployment HTTPS validado;
- fecha y representantes de ambas partes;
- referencia UAT;
- referencia de capacitación;
- referencia del paquete final;
- evidencia documental trazable.

La existencia de un deployment verde, uso productivo o entrega técnica no modifica por sí sola este registro.

## Propiedad

Este registro documenta la aceptación del producto contratado. No altera la titularidad de materiales canónicos del Cliente ni transfiere metodología reutilizable de N3uralia.
