# Guía ejecutable de QA visual autenticado

Fecha: 30 de julio de 2026

## Objetivo

Cerrar las validaciones que requieren un navegador real y una sesión autenticada sin modificar cuentas reales ni dejar datos ficticios persistidos.

## Preparación

- Usar producción: `https://n3uralia-intelligence-platform.vercel.app`.
- Abrir una ventana privada por perfil para evitar contaminación de sesión.
- Registrar navegador, versión, sistema operativo, resolución y hora.
- Guardar evidencia por caso: captura, resultado, incidencia y ruta.
- No cambiar datos de cuentas reales.
- Para escrituras QA, usar únicamente cuentas y expedientes QA autorizados.

## Matriz mínima de dispositivos

| Dispositivo | Viewport | Navegador mínimo |
|---|---:|---|
| Móvil pequeño | 360 × 800 | Chrome |
| Móvil grande | 390 × 844 | Safari o emulación equivalente |
| Tableta | 768 × 1024 | Chrome |
| Escritorio | 1440 × 900 | Chrome |

## Perfil CEO

1. Iniciar sesión con la cuenta CEO autorizada.
2. Confirmar redirección a `/dashboard/ceo`.
3. Abrir `/dashboard/ceo/decisiones`.
4. Validar lectura global, oficinas, responsables, vencimientos y estados.
5. Abrir una oficina desde la cola.
6. Volver y abrir el expediente.
7. Abrir `Reporte` y confirmar que corresponde al mismo ID.
8. Imprimir o guardar como PDF.
9. Confirmar que no aparecen controles de edición no autorizados por estado.

Resultado esperado: navegación global → oficina → expediente → reporte sin pérdida de contexto ni acceso denegado incorrecto.

## Perfil dirección

1. Iniciar sesión con la cuenta QA de dirección Lo Beltrán.
2. Confirmar redirección a `/dashboard/director`.
3. Validar que sólo aparecen perfiles y casos de Lo Beltrán.
4. Abrir un expediente desde la cola operativa.
5. Abrir `Ver reporte` y validar la misma valorización.
6. Intentar una URL conocida de otra oficina y documentar el rechazo.
7. En un fixture QA reversible, devolver con motivo y confirmar tarea derivada.
8. Verificar foco, mensajes de error y retorno al expediente.

Resultado esperado: alcance de oficina, navegación completa y bloqueo de acceso cruzado.

## Perfil ejecutiva

Repetir para Lo Beltrán, Nueva Costanera y Santa María.

1. Iniciar sesión.
2. Confirmar redirección a `/dashboard/partner`.
3. Validar métricas, tareas, propiedades y valorizaciones propias.
4. Abrir un expediente propio.
5. Abrir el reporte desde la navegación del expediente.
6. Confirmar que no puede aprobar ni emitir.
7. Intentar abrir el expediente QA de otra ejecutiva y documentar el rechazo.
8. En fixture reversible, vincular mercado → comparable y confirmar evidencia.

Resultado esperado: alcance personal y ausencia total de datos de otros perfiles.

## Teclado y foco

En cada perfil:

1. Recargar la página.
2. Navegar sólo con `Tab`, `Shift+Tab`, `Enter`, `Space` y `Escape` cuando corresponda.
3. Confirmar foco visible en enlaces, botones, campos y acciones.
4. Confirmar que el orden de foco sigue el orden visual.
5. Confirmar que no existe un bloqueo de teclado dentro de tablas o diálogos.
6. Activar reintentos y acciones principales mediante teclado.

## Lector de pantalla

Ejecutar al menos con NVDA + Chrome o VoiceOver + Safari:

- verificar título de página y encabezado principal;
- verificar nombres accesibles de botones y enlaces;
- verificar anuncios de carga y error;
- verificar encabezados y captions de tablas;
- verificar que estado, responsable y vencimiento no dependan sólo del color;
- verificar lectura comprensible del reporte imprimible.

## Responsive y estados vacíos

Para cada viewport:

- no debe existir desplazamiento horizontal de página;
- las tablas pueden tener desplazamiento horizontal interno;
- acciones principales deben medir al menos 44 px de alto;
- textos no deben cortarse ni superponerse;
- estados vacíos deben explicar que no existen datos, sin inventar ejemplos;
- errores deben incluir una acción recuperable cuando sea posible.

## PDF

Desde `/dashboard/valuations/[id]/report`:

1. Abrir vista previa de impresión.
2. Seleccionar A4 vertical.
3. Confirmar encabezado, ficha, valores, comparables, ajustes e historial.
4. Confirmar que filas y secciones no quedan cortadas de forma ilegible.
5. Confirmar que controles de navegación no aparecen impresos.
6. Confirmar que una publicación observada no se presenta como venta confirmada.
7. Guardar el PDF como evidencia QA, sin compartir información sensible fuera del equipo autorizado.

## Registro de resultado

| ID | Perfil | Ruta | Viewport | Caso | Resultado | Evidencia | Incidencia |
|---|---|---|---:|---|---|---|---|
| QA-VIS-001 | CEO | `/dashboard/ceo/decisiones` | 1440×900 | Navegación a reporte | Pendiente | — | — |

Estados permitidos: `Aprobado`, `Fallido`, `Bloqueado`, `No aplica`.

## Criterio de cierre

La aceptación visual se cierra cuando:

- todos los casos críticos están aprobados en escritorio y móvil;
- no hay acceso cruzado entre oficinas o ejecutivas;
- navegación por teclado no presenta bloqueos;
- el reporte se guarda como PDF legible;
- las incidencias críticas y altas están resueltas y revalidadas;
- los pendientes de negocio quedan separados de los defectos técnicos.
