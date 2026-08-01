# Inventario de base de datos heredada

Fecha de corte: 2026-08-01

## Alcance

Este inventario cubre tablas de agentes, copiloto, Thor y módulos antiguos que ya no forman parte del runtime contractual principal. Los conteos son estimaciones de `pg_stat_user_tables`; deben confirmarse con conteos exactos antes de cualquier operación de archivo o eliminación.

| Tabla | Filas estimadas | Tamaño total | FK salientes | FK entrantes | RLS |
|---|---:|---:|---:|---:|---|
| `agent_approvals` | 0 | 24 KB | 3 | 0 | Activo |
| `agent_artifacts` | 0 | 32 KB | 2 | 0 | Activo |
| `agent_evaluations` | 0 | 40 KB | 3 | 0 | Activo |
| `agent_findings` | 0 | 24 KB | 2 | 3 | Activo |
| `agent_metric_snapshots` | 0 | 32 KB | 0 | 0 | Activo |
| `agent_notifications` | 0 | 32 KB | 3 | 0 | Activo |
| `agent_runs` | 67 | 152 KB | 2 | 6 | Activo |
| `agent_schedules` | 3 | 48 KB | 1 | 0 | Activo |
| `agent_sources` | 0 | 24 KB | 1 | 0 | Activo |
| `ai_reports` | 4 | 80 KB | 1 | 0 | Activo |
| `copilot_feedback` | 2 | 48 KB | 1 | 0 | Activo |
| `data_sources` | 7 | 32 KB | 0 | 0 | Activo |
| `executive_memory_entries` | 0 | 32 KB | 2 | 0 | Activo |
| `knowledge_documents` | 3 | 32 KB | 0 | 0 | Activo |
| `kpi_snapshots` | 6 | 32 KB | 1 | 0 | Activo |
| `recommendations` | 3 | 32 KB | 0 | 0 | Activo |
| `thor_answer_log` | 0 | 24 KB | 1 | 0 | Activo |
| `thor_claims` | 199 | 224 KB | 0 | 0 | Activo |
| `thor_questions` | 24 | 104 KB | 0 | 0 | Activo |
| `thor_source_registry` | 19 | 48 KB | 0 | 0 | Activo |

## Hallazgos

- Existe información histórica real en `agent_runs`, `agent_schedules`, `ai_reports`, `copilot_feedback`, `knowledge_documents`, `kpi_snapshots` y las tablas Thor.
- `agent_runs` y `agent_findings` forman un grafo de dependencias con varias claves foráneas entrantes; no pueden retirarse de forma aislada.
- Todas las tablas inventariadas mantienen RLS habilitado.
- Los avisos de rendimiento restantes asociados a agentes, copiloto y Thor no afectan el flujo contractual principal, pero representan deuda operativa si estas tablas vuelven a activarse.

## Decisión de retención

No se elimina ni modifica información heredada en esta fase. Las tablas quedan congeladas como archivo operativo hasta completar los siguientes controles:

1. confirmar ausencia de escrituras durante un período de observación mínimo de 30 días;
2. identificar propietarios de negocio y obligación contractual de retención;
3. obtener conteos exactos y exportación verificable antes de cualquier eliminación;
4. documentar dependencias de claves foráneas, vistas, funciones, políticas y jobs;
5. definir una fecha de corte y un procedimiento de restauración;
6. obtener autorización explícita para toda migración destructiva.

## Opciones futuras

- **Conservar en `public`**: menor riesgo inmediato, mantiene avisos y superficie operativa.
- **Mover a un esquema de archivo no expuesto**: reduce superficie PostgREST conservando historial; requiere migración coordinada de claves foráneas y permisos.
- **Exportar y eliminar**: sólo después de validación contractual, respaldo probado y aprobación explícita.

La opción recomendada para la siguiente etapa es mover el conjunto confirmado como inactivo a un esquema de archivo no expuesto, sin eliminar registros, después del período de observación.
