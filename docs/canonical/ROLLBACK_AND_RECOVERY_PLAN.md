# Plan de rollback y recuperación

## Objetivo

Restaurar una versión segura y operativa cuando un cambio produzca una falla funcional, de seguridad o de disponibilidad.

## Disparadores

- exposición o acceso no autorizado;
- errores críticos de runtime;
- pérdida de disponibilidad;
- inconsistencia grave de datos;
- falla de una función contractual principal;
- deployment no validado.

## Procedimiento

1. Declarar incidente y congelar cambios no esenciales.
2. Identificar último commit y deployment verificados.
3. Evaluar impacto en Vercel, Supabase y servicios externos.
4. Revertir la aplicación mediante deployment o commit previamente aprobado.
5. No revertir migraciones de datos destructivamente sin respaldo y autorización explícita.
6. Validar autenticación, rutas críticas, reportes y aislamiento por tenant.
7. Registrar resultado, responsable y tiempo de recuperación.
8. Abrir análisis de causa raíz y plan preventivo.

## Evidencia requerida

- commit origen y commit restaurado;
- deployment afectado y deployment recuperado;
- responsable de decisión;
- pruebas posteriores;
- impacto de datos;
- pendientes y fecha de cierre.
