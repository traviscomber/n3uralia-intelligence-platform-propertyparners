# Revisión de funciones `SECURITY DEFINER`

Fecha de revisión: 2026-08-01

## Objetivo

Clasificar las funciones `SECURITY DEFINER` visibles para `authenticated`, distinguir RPC operativas de helpers internos y documentar por qué no se revoca `EXECUTE` de forma indiscriminada.

## Controles comunes verificados

- `search_path` fijo en `public` para evitar resolución dinámica de objetos.
- las funciones que aceptan `user_id` o `viewer_id` validan que el identificador coincida con `auth.uid()` cuando existe una sesión autenticada;
- las funciones de escritura validan autenticación, alcance, rol y estado del recurso antes de modificar datos;
- varias funciones son dependencias directas de políticas RLS, triggers u otras funciones activas;
- revocar `EXECUTE` a `authenticated` sin rediseñar esas dependencias rompería los flujos contractuales.

## Clasificación

### RPC operativas intencionales

Estas funciones constituyen operaciones de negocio autorizadas desde la aplicación y deben continuar disponibles para usuarios autenticados:

- `apply_valuation_comparable_decision(...)`: valida usuario, rol/equipo, propietario del caso, estado `draft` y pertenencia del comparable antes de actualizar y registrar la decisión.
- `submit_valuation_for_review(...)`: exige que el usuario sea propietario del caso, que el caso esté en `draft` y que existan al menos tres comparables aceptados.
- `evaluate_management_alerts(...)`: exige rol de liderazgo y limita la evaluación a entidades visibles para el usuario.

### Helpers de alcance ligados a la sesión actual

Estas funciones exponen solamente cálculos de alcance derivados de la sesión y no permiten sustituir la identidad autenticada:

- `can_access_management_entity(uuid)`
- `current_user_visible_entity_ids()`
- `current_user_visible_profile_ids()`
- `is_global_management_leader(uuid)`
- `is_management_leader(uuid)`
- `is_own_management_entity(uuid, uuid)`
- `is_own_or_parent_management_entity(uuid, uuid)`

### Helpers requeridos por RLS, triggers y validaciones

Estas funciones son dependencias activas de políticas RLS o de funciones de integridad:

- `can_access_management_task(uuid, uuid)`
- `has_management_profile_scope(uuid, uuid)`
- `has_valuation_case_scope(uuid, uuid)`
- `valuation_case_has_minimum_comparables(uuid, integer)`

## Dependencias principales

- `can_access_management_entity` es utilizado por RLS de entidades, métricas, metas, alertas, reconciliaciones e informes, además de `evaluate_management_alerts`.
- `has_management_profile_scope` es utilizado por RLS de tareas, asignaciones y casos de valorización, además de funciones de protección de transiciones.
- `has_valuation_case_scope` es utilizado por RLS de versiones, comparables y registro de decisiones, además de validadores de versiones.
- `valuation_case_has_minimum_comparables` es utilizado por el control de mínimo contractual de comparables.

## Decisión

Los avisos del advisor sobre estas funciones se aceptan como exposición intencional y controlada. No se revoca `EXECUTE` mientras las funciones permanezcan en la arquitectura actual.

La eliminación completa de estos avisos requiere una migración coordinada hacia un esquema privado no expuesto, junto con reescritura de políticas RLS, funciones dependientes y pruebas de integración por rol. Esa intervención debe tratarse como un cambio arquitectónico separado, no como un ajuste automático del linter.

## Criterios para futuras modificaciones

Toda función nueva o modificada con `SECURITY DEFINER` debe:

1. fijar explícitamente `search_path`;
2. usar `auth.uid()` como fuente de identidad;
3. rechazar identificadores de usuario que no coincidan con la sesión;
4. validar alcance y estado dentro de la misma transacción;
5. limitar sus privilegios al mínimo necesario;
6. incluir pruebas por rol y por recurso fuera de alcance.
