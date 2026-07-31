# Matriz de QA y aceptación contractual

Última actualización: 30 de julio de 2026.

## Perfiles y alcance

| Flujo | CEO | Director/Subdirector | Ejecutiva | Evidencia |
|---|---|---|---|---|
| Dashboard y métricas | Global | Oficina | Personal | Guards, capacidades y RLS |
| Propiedades | Lectura y asignación global | Lectura y asignación oficina | Cartera asignada | `getUserScope()` + RLS |
| Valorizaciones | Lectura/aprobación global | Lectura/revisión oficina | Crear, corregir y reenviar propias | Workflow + historial versionado |
| Tareas | Gestión global | Gestión oficina | Inicio y cierre de asignadas | API de tareas + RLS |
| Mercado | Lectura | Lectura | Lectura | Módulo I operativo |
| Reportes | Global | Oficina | Personal | Rutas protegidas |

## Casos positivos verificados

- CEO obtiene alcance global.
- Director QA Lo Beltrán obtiene únicamente alcance de oficina.
- Ejecutivas de Lo Beltrán, Nueva Costanera y Santa María obtienen únicamente alcance personal.
- Ejecutiva Lo Beltrán puede insertar un comparable candidato desde una publicación persistida dentro de una transacción reversible.
- Dirección Lo Beltrán puede ver valorizaciones de su oficina.
- Propiedad asignada puede originar una valorización trazable.
- Devolución de valorización crea una tarea de corrección; el reenvío la cierra.

## Casos negativos verificados

- Dirección Lo Beltrán no ve valorizaciones de otras oficinas.
- Cada ejecutiva QA ve cero tareas y valorizaciones ajenas.
- Rutas críticas rechazan acceso sin capacidad aunque se ingrese la URL directamente.
- Una publicación de mercado no se presenta como venta confirmada.
- Una propiedad operativa sin identidad canónica no se escribe como `comparable_property_id`; su ID queda sólo en la evidencia con `identityStatus: unconfirmed`.

## Limpieza

Todas las pruebas de escritura SQL se ejecutan dentro de transacciones terminadas con `ROLLBACK`. No se mantienen fixtures ficticios en producción.

## Pendientes que requieren navegador autenticado

- Recorrido visual completo por cada perfil.
- Breakpoints móviles y tabletas.
- Navegación por teclado, foco visible y lector de pantalla.
- Impresión y exportación PDF de reportes y presentación.
- Estados vacíos, errores recuperables y mensajes de confirmación.

## Criterio de aceptación

Un requisito se considera cerrado únicamente cuando tiene funcionalidad implementada, control de acceso en servidor, política RLS correspondiente, build aprobado, deployment `READY` y evidencia de prueba. Las verificaciones visuales se mantienen abiertas hasta contar con una sesión real de navegador autenticado.
