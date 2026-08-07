# Procedimiento de rollback de producción

## Objetivo

Restaurar Property Partners a una versión de producción conocida y estable sin reescribir data canónica ni ejecutar migraciones destructivas.

## Alcance

Aplica al proyecto Vercel `n3uralia-intelligence-platform`, conectado al repositorio `traviscomber/n3uralia-intelligence-platform-propertyparners` y al proyecto Supabase `orfncinmhymhhoxbxgjb`.

## Regla principal

El rollback de aplicación debe hacerse mediante un deployment/commit previamente validado. No se revierte data de Supabase como parte de un rollback de frontend/backend salvo que exista una migración compensatoria explícita, revisada y no destructiva.

## Procedimiento

1. Identificar el último deployment `READY` considerado estable y registrar su commit SHA.
2. Verificar que el deployment objetivo corresponde al repositorio y proyecto correctos de Property Partners.
3. Promover el deployment estable anterior en Vercel o revertir el commit problemático mediante un commit nuevo de reversión en `main`.
4. No usar `git reset --force` sobre `main` ni borrar commits de auditoría.
5. No ejecutar `DROP`, `TRUNCATE`, eliminación masiva ni rollback de datos canónicos en Supabase.
6. Si el cambio incluyó una migración de base de datos, evaluar una migración compensatoria separada. Debe preservar evidencia histórica y tener validación previa de registros afectados.
7. Verificar después del rollback:
   - login y rutas protegidas;
   - dashboard CEO;
   - valorización;
   - inteligencia de mercado disponible;
   - reportes/document delivery;
   - ausencia de errores runtime;
   - headers de seguridad y `Cache-Control` en superficies sensibles.
8. Registrar commit/deployment restaurado, motivo, fecha y resultado de validación.

## Criterio de éxito

- Deployment en estado `READY`.
- Dominio productivo apuntando a una versión estable.
- Sin errores runtime críticos.
- Sin pérdida ni reescritura de data canónica.
- Trazabilidad del rollback conservada en GitHub/Vercel.
