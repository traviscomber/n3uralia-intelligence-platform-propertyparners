# Matriz de QA y aceptación contractual

Última actualización: 6 de agosto de 2026.

## Regla de evidencia

- **Verificado técnico:** existe implementación y una comprobación reproducible de código, base de datos, permisos o build.
- **Pendiente visual:** requiere una sesión autenticada en navegador real.
- **Dependencia cliente:** requiere fuente, definición, calendario, destinatario o aprobación formal del Cliente.
- **No disponible:** el sistema debe mostrar `n/d`, vacío o estado no confirmado; nunca completar el dato por inferencia.

## Perfiles y alcance

| Flujo | CEO | Director/Subdirector | Ejecutiva | Evidencia técnica |
|---|---|---|---|---|
| Dashboard y métricas | Global | Oficina | Personal | Guards, capacidades y RLS |
| Propiedades | Lectura y asignación global | Lectura y asignación oficina | Cartera asignada | `getUserScope()` + RLS |
| Valorizaciones | Lectura/aprobación global | Lectura/revisión oficina | Crear, corregir y reenviar propias | Workflow, historial versionado y RPC atómica |
| Tareas | Gestión global | Gestión oficina | Inicio y cierre de asignadas | API de tareas + RLS |
| Mercado | Lectura y administración según capacidad | Lectura | Lectura | Pipeline canónico, raw records, historial y estado de fuentes |
| Reportes | Global | Oficina | Personal | Rutas protegidas y generadores canónicos |

## Pilar I · Inteligencia de Mercado

### Verificado técnico

- Ingestión de publicaciones persistidas con normalización y validación.
- Historial por `source_listing_id` y fecha de observación.
- Claves canónicas sin duplicados detectados en producción.
- Versiones de publicaciones sin duplicados detectados en producción.
- Una publicación nunca se presenta como compraventa confirmada por ausencia del aviso.
- Las transacciones CBRS requieren fecha, precio y rol o dirección.
- Deduplificación de transacciones por `event_key`.
- `market_raw_records` conserva payload y validación.
- Fallos de ingestión quedan persistidos como ejecución `failed`.
- Una fuente afectada por un fallo queda en cuarentena.
- La vista de fuentes distingue registros legados de fuentes con ejecución operativa.
- La vista de fuentes muestra estado, última ejecución, frescura y error persistido.
- Identidad canónica permanece separada de una publicación candidata.

### Dependencia cliente / fuente externa

- Historial oficial completo de compraventas.
- Fuente adicional de ventas recientes.
- KML definitivo y política de actualización, cuando corresponda.
- Disponibilidad técnica/legal estable de Portal Inmobiliario para automatización continua.

## Pilar II · Valorización

### Verificado técnico

- Expediente persistido.
- Comparables aceptados y excluidos con decisión trazable.
- Ajustes acotados.
- Valor sugerido, rango y confianza.
- Mínimo de evidencia antes de avanzar workflow.
- Devolución con motivo y ciclo de corrección/reenvío.
- Aprobación y emisión restringidas al CEO.
- Transiciones críticas atómicas.
- Versiones y log de decisiones.
- Reporte imprimible basado en el expediente persistido.
- No existen fixtures ficticios de valorización en producción.

### Pendiente visual

- Validación final del PDF con un expediente real completo.

### Dependencia de datos

- Caso real completo con comparables y transacciones canónicas suficientes.

## Pilar III · Control de Gestión Comercial

### Verificado técnico

- Alcance global, oficina y personal.
- Metas persistidas y administración por alcance.
- Tareas y responsables.
- Alertas operativas.
- Métricas con fuente y período cuando la fuente existe.
- Reportes globales, de oficina y personales protegidos por capacidad.
- Trazabilidad de responsable y seguimiento en los flujos implementados.

### Dependencia cliente

- Definición oficial de captaciones brutas.
- Fórmula final de productividad cuando no esté explícita en una fuente canónica.
- Regla y desempates oficiales de rankings.
- Umbrales, severidad y escalamiento oficial de alertas.
- Metas oficiales futuras no recibidas.

## Seguridad y autorización

### Verificado técnico

- Alcance CEO global.
- Dirección/subdirección limitadas a oficina.
- Ejecutiva limitada a alcance personal.
- RLS activa sobre datos operativos relevantes.
- Funciones auxiliares de autorización fuera del schema público.
- Operaciones críticas de valorización verifican autorización de negocio.
- MFA/TOTP disponible para elevar la sesión a `aal2` en operaciones críticas configuradas.
- `/auth/mfa` compila bajo Next.js 16 con `Suspense` para `useSearchParams()`.

### Pendiente de configuración externa

- Protección de contraseñas filtradas en Supabase Auth, si continúa deshabilitada.

## Casos positivos verificados

- CEO obtiene alcance global.
- Director QA Lo Beltrán obtiene únicamente alcance de oficina.
- Ejecutivas QA obtienen únicamente alcance personal.
- Dirección puede ver valorizaciones de su oficina.
- Propiedad asignada puede originar una valorización trazable.
- Devolución de valorización crea tarea de corrección; el reenvío completa el ciclo previsto.

## Casos negativos verificados

- Dirección de una oficina no ve valorizaciones de otra oficina.
- Una ejecutiva no obtiene tareas o valorizaciones ajenas.
- Rutas críticas rechazan acceso sin capacidad aunque se ingrese la URL directamente.
- Una publicación de mercado no se presenta como venta confirmada.
- Una propiedad sin identidad confirmada no se convierte silenciosamente en comparable canónico.
- Una valorización no puede emitirse sin cumplir el workflow y autorización requeridos.

## QA reproducible

El runner técnico consolidado está en:

- `scripts/run-technical-acceptance.mjs`

Agrupa verificadores existentes de:

1. acceso y cierre contractual;
2. Inteligencia de Mercado;
3. Valorización;
4. Control de Gestión;
5. trazabilidad y artefactos;
6. build de producción.

El runner detiene la ejecución ante el primer error. No sustituye la prueba visual autenticada.

## Limpieza

Las pruebas de escritura QA deben utilizar transacciones reversibles o datos canónicos existentes. No se mantienen fixtures ficticios en producción.

## Pendientes que requieren navegador autenticado

- Recorrido visual completo por cada perfil.
- Breakpoints móviles y tabletas.
- Navegación por teclado y foco visible.
- Lector de pantalla.
- Contraste medido.
- Impresión y exportación PDF con sesión real.
- Estados vacíos, errores recuperables y confirmaciones en los flujos reales.

## Criterio de aceptación

Un requisito técnico sólo se considera cerrado cuando tiene implementación, autorización correspondiente, persistencia o fuente verificable cuando aplica, build aprobado y evidencia reproducible. La aceptación contractual definitiva permanece separada de esta matriz mientras existan dependencias del Cliente o validaciones visuales pendientes.
