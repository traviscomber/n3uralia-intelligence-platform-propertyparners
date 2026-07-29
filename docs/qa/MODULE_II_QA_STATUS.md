# Módulo II · Estado de QA

Fecha de corte: 2026-07-29

## Controles implementados y verificables por código

- Los casos nuevos se crean exclusivamente en estado `draft`.
- El cliente no puede crear directamente casos en `review`, `approved` o `issued`.
- La creación registra versión inicial y evento `case_created`.
- El expediente operativo canónico es `/dashboard/valuations/[id]`.
- La transición `draft → review` exige al menos tres comparables aceptados.
- La aprobación y emisión están restringidas a roles directivos autorizados.
- Cada transición incrementa la versión, genera snapshot y registra una decisión.
- La exclusión de comparables exige motivo.
- Los candidatos provenientes del Módulo I conservan referencias de fuente cuando existen.
- La generación repetida evita insertar candidatos ya materializados.
- Cuando no quedan comparables aceptados se limpian estimación, rango y confianza obsoletos.
- Las rutas experimentales y duplicadas del workflow fueron retiradas.

## Quality gate automatizado

El workflow `.github/workflows/contractual-ci.yml` ejecuta:

1. instalación reproducible con `pnpm install --frozen-lockfile`;
2. lint;
3. verificación del motor de identidad de mercado;
4. verificación del modelo de valorización;
5. verificación del workflow de valorización;
6. verificación de acceso al dashboard;
7. build de Next.js.

El workflow usa el lockfile real del repositorio (`pnpm-lock.yaml`) y desactiva la descarga de Chromium durante CI.

## Validaciones pendientes de UAT

- Ejecutar un caso completo desde borrador hasta emisión con datos representativos.
- Probar cuentas reales o de staging para partner, broker, subdirector, director, CEO y admin.
- Confirmar políticas RLS directamente en Supabase.
- Validar generación de candidatos con listings y transacciones unitarias reales.
- Comparar informe impreso/PDF con el snapshot emitido.
- Registrar responsables, observaciones y aceptación del cliente.

## Restricción de datos vigente

El entorno dispone de datos agregados de mercado, pero todavía no contiene un conjunto suficiente de publicaciones y transacciones unitarias reales para cerrar la validación productiva del pool de comparables. El sistema debe mantener estados vacíos y advertencias explícitas; no debe generar evidencia sintética.

## Criterio de cierre

Este documento no constituye aceptación productiva. El Módulo II sólo puede cerrarse cuando el quality gate automatizado termine correctamente y se complete la UAT indicada en `MODULE_II_ACCEPTANCE_CHECKLIST.md`.
