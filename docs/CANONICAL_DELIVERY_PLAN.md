# Plan canónico de cierre de entrega

## Fuente de verdad

El alcance se evalúa en este orden:

1. Contrato FINAL v3 del 24 de julio de 2026.
2. Anexo Comercial y Alcance Funcional vigente.
3. Órdenes de cambio aceptadas por ambas partes.
4. Evidencia técnica en `main`, Supabase y Vercel.

Los informes de avance, roadmaps anteriores y porcentajes estimados no sustituyen los criterios de aceptación.

## Regla de cumplimiento

Un requisito sólo se marca como `completo` cuando tiene:

- evidencia funcional en una ruta o proceso productivo;
- fuente y período identificables;
- persistencia o transformación reproducible;
- autorización por rol en interfaz, servidor y RLS cuando corresponda;
- prueba automatizada o evidencia QA;
- documentación operativa.

Estados permitidos:

- `completo`: implementado y verificado;
- `parcial`: existe, pero falta una parte del resultado o la evidencia;
- `estructura`: hay tablas, APIs o interfaz, pero no un flujo operativo completo;
- `dependencia_cliente`: falta fuente, definición, acceso o aprobación del Cliente;
- `pendiente`: no existe implementación suficiente.

## Orden de ejecución

### Fase 0 — Matriz de trazabilidad verificable

Objetivo: convertir el contrato y el anexo en requisitos atómicos y relacionarlos con código, API, tablas, pruebas y responsable.

Entregables:

- actualizar `docs/CONTRACTUAL_SCOPE_MATRIX.md` con estado real, no estado inicial;
- asignar identificadores estables: `MKT-*`, `VAL-*`, `MGT-*`, `AUT-*`, `ARC-*`, `DEL-*`;
- registrar dependencias del Cliente por separado de defectos técnicos;
- bloquear declaraciones de 100% sin evidencia asociada.

Criterio de cierre:

- todos los requisitos canónicos tienen estado, evidencia y siguiente acción;
- ningún requisito figura como completo sólo por existir una pantalla.

### Fase 1 — Cerrar gaps funcionales independientes del Cliente

Prioridad 1A — Valorización contractual completa:

- exponer latitud y longitud de la propiedad;
- exponer fecha de venta y distancia de cada comparable;
- validar formato y límites;
- conservar los campos en expediente, versiones y reporte;
- verificar paridad entre cálculo, base y PDF imprimible.

Prioridad 1B — Exportación de inteligencia de mercado:

- exportar CSV y XLSX desde el mismo snapshot visible;
- incluir fecha de corte, fuente, metodología y estado de identidad;
- no exportar registros no autorizados por el alcance del usuario;
- mantener valores faltantes como `n/d`.

Prioridad 1C — Salidas ejecutivas:

- consolidar reporte CEO y reporte por oficina desde el mismo modelo de datos;
- habilitar impresión/PDF con secciones y procedencia equivalentes a la vista web;
- verificar que no exista una segunda lógica de cálculo en la exportación.

Criterio de cierre:

- cada flujo funciona con datos persistidos;
- CI, build y deployment están aprobados;
- los reportes reproducen exactamente el expediente o snapshot de origen.

### Fase 2 — Automatización de fuentes de mercado

Objetivo: pasar de cargas manuales y muestras no conciliadas a un pipeline operativo controlado.

Alcance:

- CBRS: carga canónica, validación, deduplicación y conciliación;
- Portal Inmobiliario: observación permitida, normalización, historial y control de cambios;
- KML: carga, versionado y asignación geográfica reproducible;
- ventas recientes: adaptador preparado, activado cuando el Cliente entregue la fuente;
- ejecuciones idempotentes, registros de aceptación/rechazo y frescura visible;
- circuit breaker ante bloqueo, CAPTCHA, 403, 429 o HTML inesperado.

Restricción:

- no se evaden controles de acceso ni medidas anti-bot;
- cuando la fuente no sea técnica o legalmente disponible, se mantiene importación autorizada y se documenta la dependencia.

Criterio de cierre:

- una nueva fuente puede cargarse sin alterar datos existentes incorrectamente;
- los cambios de precio, estado y publicación quedan historiados;
- una publicación nunca se presenta como venta confirmada sin conciliación.

### Fase 3 — Control de gestión con datos operativos

Objetivo: eliminar la dependencia productiva de un único archivo estático de presentaciones para los KPI comerciales.

Alcance:

- pipeline de ingestión mensual para ventas, metas, cartera, seguimiento y actividad;
- almacenamiento en tablas canónicas de métricas con fuente, período y calidad;
- uso de las presentaciones 2026 sólo como evidencia histórica o dataset de referencia;
- cálculo único para CEO, oficina y partner;
- conciliación entre valores importados, derivados y reportados;
- estados `n/d` cuando no exista fuente válida.

Criterio de cierre:

- el cambio de período no requiere modificar código ni regenerar un JSON manual;
- cada KPI visible apunta a una fuente y a un período persistidos;
- los tres perfiles leen la misma definición con distinto alcance.

### Fase 4 — Reglas parametrizadas y dependencias del Cliente

Objetivo: evitar reglas provisionales codificadas y permitir activación sin cambios de código.

Configuraciones requeridas:

- definición y fuente de captaciones brutas;
- fórmula oficial de productividad;
- reglas y desempates de rankings;
- umbrales, severidad, responsable y escalamiento de alertas;
- metas por compañía, oficina y partner;
- calendario, audiencia, canal y formato de reportes;
- factores cualitativos adicionales de valorización.

Implementación:

- tablas versionadas de definiciones y políticas;
- vigencia por fecha;
- autor y aprobación;
- fallback explícito a `provisional` o `n/d`;
- historial de cambios y reproducción de períodos anteriores.

Criterio de cierre:

- ninguna regla oficial está embebida exclusivamente en componentes o APIs;
- un cambio de umbral o meta no exige deployment;
- los períodos históricos siguen reproduciendo la política vigente en su fecha.

### Fase 5 — Reportes periódicos y distribución

Objetivo: completar el ciclo generar, distribuir, reintentar y auditar.

Alcance:

- generación programada mensual y según calendario aprobado;
- cola de distribución con idempotencia;
- proveedor de correo configurable;
- estados `pending`, `sending`, `delivered`, `failed` y `cancelled`;
- reintentos con backoff y límite;
- registro de destinatario, archivo, versión, fecha y error;
- panel administrativo de ejecución y reenvío autorizado.

Criterio de cierre:

- un reporte programado queda generado y entregado o con error accionable;
- no existen duplicados por reejecución del cron;
- cada distribución es auditable.

### Fase 6 — Transferencia, QA y aceptación

Entregables técnicos:

- repositorio e historial;
- ZIP íntegro y actualizado;
- scripts de instalación y despliegue;
- modelo de datos y migraciones;
- inventario de variables y servicios;
- manual técnico y runbook de recuperación;
- manual de usuario por rol;
- manual de administración;
- evidencia de capacitación.

Pruebas finales:

- matriz positiva y negativa de roles;
- flujo mercado → asignación → valorización → revisión → reporte;
- CEO → oficina → partner → tarea;
- responsive, teclado, foco y PDF;
- reconstrucción de la solución en un ambiente seguro;
- verificación de datos, permisos, logs y ausencia de errores críticos.

Criterio de cierre:

- un tercero autorizado puede desplegar, operar y mantener la solución con los activos entregados;
- no quedan defectos críticos o altos;
- las dependencias del Cliente están resueltas o formalmente aceptadas como pendientes.

## Secuencia de PR

1. `audit: replace initial scope statuses with verified canonical matrix`
2. `valuation: complete contractual subject and comparable evidence fields`
3. `market: add scoped snapshot exports with provenance`
4. `reports: align executive printable outputs with canonical data model`
5. `market: operationalize source ingestion and history`
6. `management: persist monthly commercial metrics and provenance`
7. `management: parameterize rankings, alerts, targets and KPI definitions`
8. `reports: complete scheduled distribution lifecycle`
9. `delivery: add reproducible deployment and role manuals`
10. `qa: add contractual end-to-end acceptance suite`

## Control de cada PR

Cada PR debe:

- resolver un grupo pequeño de requisitos;
- incluir o actualizar prueba verificable;
- no mezclar refactor amplio con cambio funcional;
- pasar lint, verificadores contractuales y build;
- tener preview Vercel `READY`;
- incluir verificación SQL cuando modifica persistencia o permisos;
- actualizar la matriz de trazabilidad;
- indicar claramente qué queda pendiente y por qué.

## Dependencias externas actualmente conocidas

- fuente adicional de ventas recientes;
- archivo KML oficial y su política de actualización, si la versión final no está cargada;
- definición oficial de captaciones;
- fórmulas y metas oficiales no presentes en las fuentes actuales;
- reglas de ranking, alertas y escalamiento;
- calendario y destinatarios de reportes;
- proveedor y credenciales de correo;
- responsables de UAT y aprobación;
- política final de conservación y tratamiento de datos.

Estas dependencias no autorizan a inventar reglas. El sistema debe permanecer operativo con estados provisionales o `n/d` hasta recibir una fuente o aprobación válida.
