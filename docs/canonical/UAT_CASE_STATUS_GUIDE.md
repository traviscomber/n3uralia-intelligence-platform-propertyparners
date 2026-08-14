# Guía de estado de casos UAT

## Propósito

Mantener una fuente única y verificable para los ocho casos mínimos definidos en el plan UAT. El registro no reemplaza la ejecución ni la aceptación del Cliente.

## Reglas

- `pending`: caso aún no ejecutado o sin evidencia suficiente.
- `passed`: resultado esperado confirmado con evidencia.
- `failed`: desviación abierta que impide aceptar el caso.
- `blocked-client-input`: no puede ejecutarse por información o definición pendiente del Cliente.
- `accepted-with-observation`: resultado aceptado con observación documentada, responsable y fecha.

Un estado completado debe incluir referencias verificables. No se debe usar una descripción general como sustituto de capturas, registros, commit, deployment o acta.

## Cierre

La UAT no puede declararse aceptada mientras exista un caso bloqueante en `pending` o `failed`. Los casos `blocked-client-input` deben quedar vinculados al registro de dependencias del Cliente y ser aceptados expresamente como pendientes si se pretende cerrar el proyecto.
