# Manual de administración — Property Partners

Estado: operativo

## 1. Propósito

Este manual describe la administración funcional y técnica disponible en la plataforma sin asumir definiciones de negocio aún no entregadas por el Cliente.

## 2. Principios operativos

La administración debe preservar esta cadena:

`Data canónica → inteligencia → acción → responsable → seguimiento → resultado → informe`

Reglas obligatorias:

- no crear datos ficticios para completar indicadores;
- no convertir publicaciones observadas en ventas confirmadas sin evidencia;
- no alterar históricos para corregir visualmente un período;
- conservar fuente, período y trazabilidad;
- mantener explícitos los estados parcial, insuficiente, fallido o en cuarentena;
- aplicar el menor privilegio necesario por rol.

## 3. Roles administrativos

### CEO

Autoridad de negocio global. Posee lectura global, gestión comercial global, asignación global y aprobación de valorizaciones.

### Administrador técnico

Administra usuarios, configuración, fuentes y operación técnica global. No posee la capacidad de aprobación global de valorizaciones reservada al CEO.

### Director/Subdirector

Administración limitada a la oficina: asignaciones, metas, alertas, tareas y revisión de valorizaciones dentro de su alcance.

## 4. Usuarios y permisos

Ruta principal:

`/dashboard/settings`

La autorización se define mediante capacidades centrales y alcance `global`, `office` o `self`. No se deben agregar permisos solo en la interfaz; cualquier nueva capacidad debe reflejarse también en guards de servidor y políticas RLS cuando corresponda.

Al modificar un usuario:

1. confirmar su rol de negocio;
2. confirmar su oficina/equipo;
3. verificar el alcance esperado;
4. comprobar la navegación visible;
5. verificar que las APIs respeten el mismo alcance;
6. ejecutar una prueba negativa con un recurso fuera de alcance cuando el cambio afecte permisos.

## 5. Fuentes de mercado

Ruta:

`/dashboard/market/fuentes`

Revisar:

- estado de la fuente;
- tipo y procedencia;
- última ejecución;
- filas recibidas, aceptadas y rechazadas;
- frescura;
- último error;
- cuarentena;
- ejecuciones sin registros raw;
- inconsistencias de conteo.

Una fuente legada sin ejecución vinculada es evidencia histórica o registro heredado; no debe tratarse como una carga operativa actual.

Estados relevantes:

- `active`: fuente operativa aceptada;
- `quarantined`: no utilizar como fuente canónica hasta resolver el problema;
- `superseded`: reemplazada por otra fuente o versión.

## 6. Ingestión de mercado

Ruta:

`/dashboard/market/import`

La API de importación soporta previsualización antes de persistir. Los pipelines canónicos conservan ejecución, raw records, validación y resultados de aceptación/rechazo.

Tipos actualmente contemplados:

- publicaciones de Portal Inmobiliario;
- transacciones CBRS;
- agregados de mercado;
- benchmarks externos autorizados.

En una ejecución fallida debe existir un registro persistente con estado `failed`. La fuente afectada debe quedar en cuarentena cuando el fallo corresponda a su pipeline.

No reintentar una fuente modificando manualmente registros canónicos. Corregir la causa y volver a ejecutar el pipeline autorizado.

## 7. Identidad y deduplicación

Las propiedades y publicaciones usan claves persistidas para evitar duplicados. La identidad confirmada debe sustentarse en evidencia; no debe confirmarse por una similitud automática aislada.

Antes de fusionar o confirmar una identidad:

- verificar rol cuando exista;
- revisar dirección normalizada;
- revisar coordenadas y atributos disponibles;
- revisar fuentes vinculadas;
- conservar evidencia de la decisión.

## 8. Control de gestión

Ruta operativa:

`/dashboard/control/operations`

Ruta administrativa:

`/dashboard/control/admin`

Permite revisar importaciones, metas, alertas y procesos comerciales. Las definiciones oficiales de KPI, rankings y umbrales deben ser configuradas solo cuando exista una definición aprobada.

No codificar una regla contractual pendiente como si fuera definitiva. Mantener `provisional`, `n/d` o equivalente cuando corresponda.

## 9. Valorizaciones

Ruta:

`/dashboard/valuations`

Controles administrativos relevantes:

- expediente y propiedad vinculada;
- comparables con evidencia;
- ajustes dentro de límites permitidos;
- confianza del caso;
- historial de decisiones;
- revisión y devolución;
- aprobación CEO;
- emisión final.

Los estados preliminares no son publicables. No crear casos QA o ficticios en producción para completar una prueba contractual.

## 10. Informes

Rutas principales:

- `/dashboard/reportes/canonicos`;
- `/dashboard/reportes/autonomos`;
- `/dashboard/reportes/operacion`.

Los informes deben usar exclusivamente datos canónicos persistidos. La capa de IA puede analizar, redactar y recomendar, pero no modificar la fuente canónica ni inventar información ausente.

Antes de emitir un informe:

- confirmar período;
- confirmar cobertura de datos;
- revisar alertas de calidad;
- verificar que el PDF corresponde al mismo snapshot/modelo de datos que la vista;
- conservar versión y trazabilidad de generación.

## 11. Operación ante incidentes

### Fuente fallida

1. revisar `/dashboard/market/fuentes`;
2. identificar `runId`, fuente y último error;
3. confirmar si quedó en cuarentena;
4. corregir credenciales, formato o adaptador según el error;
5. volver a ejecutar la fuente autorizada;
6. verificar conteos y raw records.

### Datos inconsistentes

No corregir directamente el dashboard. Revisar la fuente, la ejecución y el registro canónico que alimenta la métrica.

### Falta de información

Mantener el dato ausente. Registrar la dependencia externa si corresponde.

### Problema de permisos

Comparar rol, oficina, capacidad requerida y política RLS. No resolver agregando acceso global temporal salvo procedimiento de emergencia formal.

## 12. Seguridad

Principios vigentes:

- RLS activa en tablas protegidas;
- helpers de autorización fuera del esquema público cuando corresponde;
- RPC privilegiadas limitadas a operaciones de negocio justificadas;
- aprobación de valorizaciones reservada al CEO;
- service role solo en servidor;
- secretos nunca deben exponerse al cliente ni registrarse en documentación.

Las configuraciones de Auth gestionadas desde Supabase, como políticas de contraseña o MFA global, deben verificarse en el panel correspondiente cuando no exista una API administrativa disponible en la plataforma.

## 13. Verificación después de cambios

Todo cambio funcional o de persistencia debe verificar como mínimo:

- compilación/build;
- deployment correspondiente;
- ruta afectada;
- permisos positivos y negativos;
- integridad de datos;
- ausencia de registros ficticios;
- trazabilidad del cambio;
- actualización de documentación cuando cambie el comportamiento operativo.

## 14. Dependencias que no debe resolver el administrador por inferencia

No definir unilateralmente:

- captaciones oficiales;
- productividad oficial;
- rankings y desempates;
- umbrales y escalamiento de alertas;
- metas no entregadas;
- calendario y destinatarios finales de reportes;
- factores cualitativos adicionales de valorización;
- fuentes externas no autorizadas.

Estas materias deben permanecer pendientes o provisionales hasta contar con una fuente o aprobación válida.
