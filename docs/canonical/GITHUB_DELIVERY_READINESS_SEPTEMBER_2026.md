# Preparación de entrega GitHub · septiembre de 2026

## Objetivo

Preparar una entrega controlada del repositorio a fines de septiembre de 2026 sin transferir inteligencia propietaria de N3uralia ni alterar la propiedad del cliente sobre sus materiales canónicos.

## Regla de propiedad

### Propiedad del cliente

Se conserva y entrega:

- archivos canónicos enviados o aprobados por Property Partners;
- contratos, anexos, brandbook, documentos, planillas, imágenes y presentaciones;
- datos CRM, propiedades, contactos, transacciones, reportes y configuraciones específicas;
- lógica necesaria para operar el negocio inmobiliario y utilizar esos materiales.

La normalización, transformación o incorporación al producto no cambia esta titularidad.

### Propiedad N3uralia

Se protege y, cuando corresponda, se extrae antes de la entrega:

- prompts internos;
- heurísticas y reglas de inferencia reutilizables;
- scoring propietario;
- agentes, orquestadores y evaluadores genéricos;
- políticas internas y lógica transversal aplicable a otros clientes.

Los elementos con origen o titularidad no demostrada se clasifican como `requires-review`.

## Criterios de salida obligatorios

La entrega no queda aprobada hasta que todos estos controles tengan evidencia verificable:

1. El repositorio entregable es privado y la lista de colaboradores fue revisada.
2. No existen secretos, credenciales ni valores sensibles en archivos, commits entregables, logs o artefactos.
3. `productionBrowserSourceMaps` está explícitamente deshabilitado.
4. Ningún componente `use client` importa el motor, gateway o módulos propietarios.
5. Las APIs devuelven DTO mínimos y no exponen prompts, scoring, reglas, trazas o estructuras internas.
6. Los logs no contienen payloads, documentos completos, tokens, cookies, prompts o datos sensibles.
7. Vercel está verde en el commit exacto de entrega y sus variables fueron revisadas por ambiente.
8. Supabase tiene RLS y políticas verificadas por rol y tenant en todas las tablas expuestas.
9. Las funciones `SECURITY DEFINER` tienen `search_path` fijo y permisos de ejecución mínimos.
10. Los archivos están clasificados como `client-owned-canonical`, `client-core`, `shared-contract`, `n3uralia-proprietary`, `secret-or-credential` o `requires-review`.
11. Se generó una copia entregable sin módulos confirmados como `n3uralia-proprietary`, cuando la transferencia de control lo requiera.
12. Se documentaron commit, fecha, responsables, rollback y alcance exacto de la entrega.

## Calendario operativo

### Agosto

- cerrar inventario de propiedad y exposición;
- corregir imports, APIs, logs, source maps y variables públicas;
- auditar RLS, funciones privilegiadas y aislamiento de tenant;
- mantener Vercel verde después de cada bloque.

### Primera mitad de septiembre

- congelar la clasificación de archivos;
- revisar colaboradores, ramas, tags, releases y artefactos;
- probar una copia candidata de entrega;
- validar flujos críticos, reportes, documentos y permisos.

### Segunda mitad de septiembre

- aplicar correcciones finales;
- rotar credenciales únicamente con autorización explícita;
- producir commit candidato de entrega;
- ejecutar auditoría final GitHub, Vercel y Supabase;
- registrar aceptación técnica y contractual.

## Bloqueos automáticos

La entrega se bloquea ante:

- build o deployment fallido o pendiente;
- secretos o credenciales detectados;
- código propietario incluido en bundles del navegador;
- APIs o logs que revelen implementación interna;
- tablas expuestas sin RLS efectivo;
- cruces de tenant;
- propiedad ambigua no resuelta;
- ausencia de rollback o commit exacto de entrega.

## Estado actual

- Repositorio: privado.
- Arquitectura operativa: una aplicación, ejecución server-side en Vercel.
- Browser source maps: deshabilitados en configuración.
- Auditoría preventiva de exposición: integrada al build.
- Supabase: auditoría en curso; existen funciones privilegiadas pendientes de revisión individual.
- Entrega: no aprobada todavía.
