# Checklist final de aceptación contractual

Última actualización: 30 de julio de 2026

## Criterio de estado

- **Verificado:** existe implementación y evidencia técnica reproducible.
- **Pendiente visual:** requiere sesión autenticada en navegador real.
- **Pendiente negocio:** requiere definición formal del cliente.
- **No disponible en fuente:** la plataforma debe mostrar `n/d` y no inferir datos.

## 1. Autenticación, perfiles y permisos

| Requisito | Estado | Evidencia |
|---|---|---|
| Autenticación y perfil válido | Verificado | `lib/user-scope.ts`, guards y post-login por rol |
| Alcance CEO global | Verificado | capacidades, rutas protegidas y matriz RLS |
| Alcance dirección por oficina | Verificado | RLS autenticada y pruebas negativas entre oficinas |
| Alcance ejecutiva personal | Verificado | RLS autenticada para tres oficinas |
| Protección servidor y API | Verificado | `lib/access-guards.ts` y APIs críticas |
| Recorrido visual de todos los perfiles | Pendiente visual | requiere navegador autenticado |
| Cuenta QA subdirector independiente | Pendiente negocio | no existe identidad designada; no se crea sin autorización |

## 2. Perfil ejecutiva

| Requisito | Estado | Evidencia |
|---|---|---|
| Dashboard personal y métricas | Verificado | metas, MoM, YoY, seguimiento, conversión, fuente y período |
| Cartera asignada | Verificado | workspace personal bajo alcance autenticado |
| Propiedad a valorización | Verificado | origen y asignación preservados |
| Comparables y expediente | Verificado | candidatos, aceptación, exclusión y ajustes |
| Tareas y alertas personales | Verificado | inicio, cierre y nota de resolución |
| Corrección después de devolución | Verificado | edición sólo en `draft` y propietario |
| Reporte imprimible de valorización | Verificado por código/build | ruta `/dashboard/valuations/[id]/report` |
| Responsive y estados vacíos | Verificado por código; pendiente visual | grids adaptativos, tablas con scroll y mensajes explícitos |

## 3. Dirección y subdirección

| Requisito | Estado | Evidencia |
|---|---|---|
| Resultados de oficina y equipo | Verificado | dashboard y comparación con promedio |
| Metas, MoM y YoY | Verificado | bloque canónico por oficina |
| Fichas individuales | Verificado | navegación y alcance de perfiles visibles |
| Revisión de valorizaciones | Verificado | cola de revisión por oficina |
| Devolución con observación | Verificado | motivo obligatorio |
| Tarea derivada y responsable | Verificado | tarea enlazada al expediente y ejecutiva |
| Corrección y reenvío | Verificado | tarea cerrada e historial versionado |
| Aislamiento entre oficinas | Verificado | prueba autenticada negativa |
| Diferencia director/subdirector | Pendiente negocio | contrato actual no define diferencia operativa específica |

## 4. CEO y consolidación

| Requisito | Estado | Evidencia |
|---|---|---|
| Consolidado y por oficina | Verificado | dashboard, detalle y reporte CEO |
| Metas, MoM, YoY y evolución | Verificado | bases 2025 visibles y metodología |
| Rankings y alertas | Verificado como regla derivada | etiquetados como operacionales, no aprobados oficialmente |
| Centro de decisiones | Verificado | oficina, responsable, caso, tarea, vencimiento e historial |
| Presentación ejecutiva | Verificado por código/build | ruta protegida existente |
| Reporte CEO | Verificado por código/build | comparación global y por oficina |
| PDF y recorrido visual | Pendiente visual | requiere navegador autenticado |
| Umbrales y métrica oficial de ranking | Pendiente negocio | requiere validación formal |

## 5. Integración de módulos

| Flujo | Estado | Evidencia |
|---|---|---|
| Mercado a comparable | Verificado | publicación persistida y evidencia mínima |
| Propiedad a asignación a valorización | Verificado | trazabilidad de origen |
| Valorización a historial y versiones | Verificado | decisión y snapshot |
| Revisión a tarea a corrección a reenvío | Verificado | ciclo funcional |
| Alerta a responsable y seguimiento | Verificado | tareas de oficina y CEO |
| Mercado a comparable QA reversible | Verificado | inserción autenticada y `ROLLBACK` |
| Evidencia de comparables en reporte | Verificado por código/build | reporte imprimible nuevo |

## 6. Datos y metodología

| Requisito | Estado | Tratamiento |
|---|---|---|
| Fuente y período visibles | Verificado | métricas personales, dirección y CEO |
| Publicación no presentada como venta | Verificado | etiqueta de candidato y metodología |
| Propiedad operativa no confundida con canónica | Verificado | `comparable_property_id = null` sin identidad confirmada |
| Captaciones brutas | No disponible en fuente | se mantiene `n/d`; no se reemplaza por stock |
| Comparación YoY | Verificado | valores 2025 y recálculo de calidad |
| Valores faltantes | Verificado | mensajes `No disponible`, sin datos ficticios |

## 7. Responsive, accesibilidad y recuperación

### Verificado por revisión de código y build

- estructura semántica con `main`, `header`, `section`, encabezados y tablas;
- captions de tablas y encabezados con `scope` en el reporte imprimible;
- estados de carga con `role=status` y `aria-live`;
- errores recuperables con `role=alert` y acción de reintento;
- controles con foco visible;
- objetivos táctiles mínimos en acciones principales;
- grids adaptativos y tablas anchas dentro de contenedores desplazables;
- estilos de impresión que ocultan navegación y evitan cortes innecesarios;
- estados vacíos explícitos para comparables y decisiones.

### Pendiente visual

- revisión móvil 320–430 px;
- tableta 768–1024 px;
- escritorio 1280 px o superior;
- navegación completa sólo con teclado;
- lector de pantalla;
- contraste medido;
- impresión y PDF con sesión real.

## 8. Producción y aceptación

Para cerrar aceptación definitiva deben cumplirse simultáneamente:

1. último commit funcional en deployment `READY`;
2. TypeScript y build aprobados;
3. runtime sin errores fatales asociados al deployment;
4. matriz RLS y pruebas negativas vigentes;
5. recorrido visual autenticado por CEO, dirección y ejecutiva;
6. revisión de PDF y responsive;
7. definición formal de ranking y umbrales, o aceptación explícita de su carácter derivado;
8. captaciones mantenidas como `n/d` hasta recibir fuente válida.

La ausencia de navegador autenticado impide declarar cerrados los puntos visuales, pero no invalida las pruebas de código, build, RLS y datos ya ejecutadas.
