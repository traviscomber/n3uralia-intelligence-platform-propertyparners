# Supabase RPC hardening — 2026-08-07

## Alcance

Validación de funciones `SECURITY DEFINER` expuestas por la API de Supabase del proyecto Property Partners. Este cambio modifica únicamente permisos de ejecución; no modifica datos canónicos, fórmulas, métricas ni contenido productivo.

## Hallazgos corregidos

1. `public.refresh_market_property_match_candidates()` tenía permiso `EXECUTE` para `anon`. La función ya contenía validación de rol, pero no existe una razón válida para exponerla al rol anónimo. Se revocó `EXECUTE` a `anon`.
2. `public.ingest_portal_listing_snapshot(...)` tenía permiso `EXECUTE` para `authenticated` y no realizaba autorización interna antes de ejecutar la ingestión como `SECURITY DEFINER`. Se revocó `EXECUTE` a `PUBLIC`, `anon` y `authenticated`, manteniendo únicamente `service_role`.

## Verificación

Después de aplicar la migración `restrict_security_definer_rpc_execution`:

- `ingest_portal_listing_snapshot`: `anon=false`, `authenticated=false`, `service_role=true`.
- `refresh_market_property_match_candidates`: `anon=false`, `authenticated=true`, `service_role=true`.
- El advisor de seguridad de Supabase dejó de reportar ambos accesos corregidos.

Las funciones `apply_valuation_comparable_decision`, `evaluate_management_alerts`, `refresh_market_property_match_candidates` y `transition_valuation_case_atomic` continúan disponibles para usuarios autenticados porque contienen validación explícita de identidad, rol y/o alcance dentro de la función.

## Pendiente externo de plataforma

Supabase Auth reporta `Leaked Password Protection Disabled`. No se modifica desde SQL ni desde el repositorio. Debe habilitarse desde la configuración administrada de Auth si el plan/cuenta lo permite.
