# Property Partners Intelligence Platform — Modelo de autorización

Actualizado: 2026-08-06

## Principio

La autorización se aplica en cuatro capas coherentes:

1. navegación y capacidades de interfaz;
2. validación de rutas API;
3. políticas RLS;
4. funciones RPC con autorización interna.

Ninguna capa reemplaza a las demás. La interfaz no constituye una barrera de seguridad.

## Clasificación de funciones

### Internas / service role

Estas funciones no deben estar disponibles como RPC para usuarios finales:

- triggers de auditoría y protección;
- funciones de ingestión masiva;
- snapshots y workers;
- helpers de integridad de Valorizaciones;
- `submit_valuation_for_review`, conservada únicamente como helper legacy interno;
- `valuation_case_has_minimum_comparables`.

Acceso esperado: `postgres` y `service_role`.

### RPC autenticadas de negocio

Estas funciones son acciones explícitas del producto y deben validar `auth.uid()`, rol, alcance, estado y evidencia dentro de la propia función:

- `apply_valuation_comparable_decision`;
- `transition_valuation_case_atomic`;
- `evaluate_management_alerts`.

Acceso esperado: `authenticated` y `service_role`. Nunca `anon`.

### Auxiliares de autorización RLS

Estas funciones son ejecutadas por políticas RLS y requieren permiso `EXECUTE` para `authenticated` mientras permanezcan en el esquema expuesto:

- `can_access_management_entity`;
- `can_access_management_task`;
- `has_management_profile_scope`;
- `has_valuation_case_scope`;
- `is_global_management_leader`;
- `is_management_leader`;
- `is_own_management_entity`;
- `is_own_or_parent_management_entity`;
- `current_user_visible_entity_ids`;
- `current_user_visible_profile_ids`.

Su exposición directa por PostgREST es un riesgo conocido. El cierre definitivo consiste en moverlas a un esquema privado y actualizar las políticas, no en revocar permisos sin migrar las dependencias.

## Reglas obligatorias

- Ninguna función `SECURITY DEFINER` puede ser ejecutable por `anon`.
- Toda función `SECURITY DEFINER` debe fijar `search_path`.
- Las RPC de negocio deben validar identidad y alcance dentro de la transacción.
- Los triggers no deben ser invocables directamente por usuarios autenticados.
- Las operaciones de aprobación y emisión deben ser atómicas.
- `service_role` se usa solo desde servidor y nunca se expone al navegador.

## Estado actual

- RPC anónimas de Valorizaciones: cerradas.
- Triggers de Valorizaciones: restringidos a ejecución interna.
- Workflow productivo: `transition_valuation_case_atomic`.
- Helpers legacy de Valorizaciones: restringidos a `service_role`.
- Auxiliares RLS: aún en `public`; migración a esquema privado pendiente.
- `document_recipients`: RLS sin política explícita, pendiente del siguiente grupo.
- Protección de contraseñas filtradas: pendiente de configuración de Auth.

## Señal de cierre

- cero funciones privilegiadas ejecutables por `anon`;
- cero helpers internos expuestos como RPC;
- auxiliares RLS fuera del esquema API público;
- cero tablas con RLS sin política definida;
- autenticación reforzada para CEO y administración.
