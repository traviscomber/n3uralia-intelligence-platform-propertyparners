# Extracción y limpieza del runtime propietario N3uralia

## Objetivo

Permitir que Property Partners continúe operando la plataforma conforme al contrato sin recibir el código fuente propietario de N3uralia.

La continuidad operativa tiene prioridad. Ningún módulo se elimina del repositorio entregable hasta que el runtime privado esté desplegado, autenticado, observado y validado en paralelo.

## Paso 4 — Sustituir imports directos

Toda llamada desde la plataforma Property Partners debe usar:

- `lib/n3uralia-runtime-contract.ts` para tipos y DTO compartidos;
- `lib/n3uralia-runtime-client.ts` para comunicación servidor a servidor;
- `N3URALIA_RUNTIME_URL` y `N3URALIA_RUNTIME_SERVICE_TOKEN`, sólo en servidor.

Está prohibido importar desde UI, componentes cliente o rutas entregables:

- motor de inteligencia;
- agentes y orquestadores;
- prompts;
- scoring y reglas de decisión;
- memoria o metodologías reutilizables.

La migración se ejecuta módulo por módulo con pruebas de paridad. Durante la transición puede existir un adaptador temporal exclusivamente server-side, pero debe quedar identificado para eliminación.

## Paso 5 — Retirar lógica propietaria del repositorio del Cliente

Después de validar el runtime remoto:

1. mover el código fuente al repositorio privado N3uralia;
2. confirmar que el repositorio Property Partners conserva sólo contratos, adaptadores y resultados autorizados;
3. eliminar prompts, heurísticas, scoring, agentes, reglas y trazas internas;
4. verificar que ninguna respuesta API permita reconstruir la implementación;
5. ejecutar auditoría de bundles y búsquedas de referencias residuales;
6. mantener evidencia de pruebas y aprobación de continuidad operacional.

No deben retirarse módulos mientras la plataforma dependa de ellos para funciones contractuales activas.

## Paso 6 — Limpiar historial Git

Eliminar archivos del árbol actual no los elimina del historial. Antes de transferir el repositorio al Cliente debe realizarse una reescritura controlada del historial.

Procedimiento obligatorio:

1. congelar merges y despliegues;
2. crear backup privado e inmutable del repositorio completo bajo control N3uralia;
3. generar una lista exacta de rutas y blobs propietarios;
4. ejecutar `git filter-repo` en un clon aislado;
5. inspeccionar todas las ramas, tags y referencias;
6. ejecutar escaneo de secretos y búsqueda de términos propietarios;
7. comparar funcionalidad contra el repositorio previo;
8. coordinar force-push sólo después de aprobación escrita;
9. invalidar forks, clones, caches y artefactos antiguos cuando sea posible;
10. exigir nuevo clone a todos los colaboradores autorizados.

La reescritura de historial no debe ejecutarse mediante cambios normales de GitHub ni sin ventana de mantenimiento, porque puede romper referencias, PR, tags y despliegues.

## Garantía de continuidad contractual

Property Partners debe conservar:

- acceso funcional a la plataforma;
- datos y documentos propios;
- reportes y resultados autorizados;
- configuración específica del servicio;
- contratos de API necesarios para integración;
- mecanismos documentados de continuidad y soporte.

Property Partners no recibe por defecto:

- código fuente del runtime N3uralia;
- prompts y políticas internas;
- agentes, orquestadores y scoring;
- metodologías reutilizables;
- datos, modelos o resultados de otros clientes.

## Criterio de cierre de los pasos 4–6

Los pasos se consideran completos únicamente cuando:

- todas las llamadas productivas usan el runtime privado;
- las pruebas de paridad y continuidad contractual pasan;
- no queda código propietario en el árbol entregable;
- el historial limpio fue auditado;
- la versión entregable fue aprobada técnica y contractualmente;
- existen rollback, monitoreo y soporte definidos.
