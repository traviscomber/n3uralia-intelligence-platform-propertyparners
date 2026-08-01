# Manual de administración

Fecha: 1 de agosto de 2026.

## 1. Responsabilidades

La administración técnica y funcional debe mantener:

- usuarios y roles correctos;
- alcance de oficina y perfil;
- fuentes autorizadas;
- trazabilidad de importaciones;
- métricas, metas y reglas aprobadas;
- reportes y destinatarios;
- secretos, respaldos, logs e incidentes;
- documentación alineada con producción.

## 2. Alta y modificación de usuarios

1. Crear la cuenta en Supabase Auth mediante un canal autorizado.
2. Crear o verificar `profiles` con el mismo UUID.
3. Asignar uno de los roles vigentes: `admin`, `ceo`, `director`, `subdirector`, `seller`.
4. Para dirección/subdirección, registrar `team` exactamente como la oficina canónica.
5. Para partner, vincular `management_entities.profile_id`.
6. Confirmar la jerarquía `office → partner` mediante `parent_id`.
7. Ejecutar QA de aislamiento antes de entregar credenciales.

No reutilizar cuentas entre personas.

## 3. Baja de usuarios

1. Deshabilitar o eliminar la sesión en Auth según política.
2. Desactivar asignaciones organizacionales.
3. Reasignar tareas, propiedades y casos pendientes.
4. Conservar logs y decisiones históricas.
5. No borrar expedientes emitidos ni evidencia de auditoría.

## 4. Gestión de entidades

`management_entities` representa compañía, oficinas, equipos y partners.

Controles:

- nombres de oficina únicos y consistentes;
- partner con `profile_id` inequívoco;
- `parent_id` hacia la oficina correcta;
- `active=false` para entidades retiradas;
- metadata sin secretos ni datos personales innecesarios.

Después de cambios jerárquicos, ejecutar `Authenticated role QA`.

## 5. Fuentes de mercado

Antes de cargar:

- confirmar autorización legal y contractual;
- identificar sistema y dataset;
- registrar nombre, archivo, hash y período;
- validar campos obligatorios;
- usar una muestra de staging cuando la fuente sea nueva.

Compatibilidades:

| Fuente | Dataset |
|---|---|
| Portal Inmobiliario | `portal_apartments`, `portal_houses`, `portal_projects` |
| CBRS | `registered_sales` |
| Cliente | `client_sales` |
| KML | `kml_neighborhoods` |

La captura viva de Portal es una muestra no reconciliada y no escribe en producción. No evadir CAPTCHA, bloqueos o términos del proveedor.

## 6. Métricas de gestión

### Importación

Usar `/api/management/import` con:

- entidad existente y visible;
- código activo;
- período común;
- fuente y referencia;
- valor o estado explícito no evaluable;
- versión de fórmula;
- evidencia.

### Publicación

El dashboard no debe sustituir datos documentales con cualquier fila importada. Sólo usa `management_approved_metric_values`, que exige:

- cálculo canónico;
- calidad verificada;
- conciliación exacta o dentro de tolerancia;
- aprobación y autorización de publicación.

### Metas

Una meta sólo se usa cuando está aprobada o tiene aprobación registrada. Mantener entidad, métrica, período y versión alineados con el valor.

## 7. Reglas y alertas

- Crear reglas únicamente con umbrales aprobados.
- Definir severidad, alcance y responsable.
- Probar períodos sin datos y denominadores cero.
- Evitar alertas duplicadas abiertas.
- Documentar reconocimiento, resolución o descarte.

No convertir reglas provisionales en evaluación laboral oficial sin aprobación del Cliente.

## 8. Reportes

### Programaciones

Sólo CEO/admin crea o modifica schedules.

Validar:

- tipo de reporte;
- entidad o alcance global;
- cadencia;
- día 1–28;
- destinatarios autorizados;
- `next_run_at` futuro.

### Cron

- Ruta: `/api/cron/management-monthly`.
- Protección: `Authorization: Bearer CRON_SECRET`.
- Vercel debe contener el mismo secreto en Production.
- No registrar el valor en logs.

### Recuperación manual

CEO/admin puede ejecutar `POST /api/management/reports/run`. Procesa sólo programaciones vencidas y conserva idempotencia normal por schedule/período.

### Distribución

El sistema registra destinatarios y estado. Mientras no exista proveedor de correo validado:

- `pending` significa pendiente/manual;
- `sent` requiere referencia externa;
- `failed` requiere error;
- `acknowledged` requiere confirmación.

## 9. Secretos

- Mantener secretos en Vercel, GitHub Actions o gestor aprobado.
- Usar valores distintos por entorno.
- Limitar acceso administrativo.
- Rotar al transferir control.
- Revisar logs tras una exposición.
- Nunca copiar `service_role` al frontend.

## 10. Backups y recuperación

- Confirmar plan de backups contratado en Supabase.
- Probar restauración en un entorno aislado.
- Registrar RPO/RTO acordados.
- Antes de una migración de riesgo, generar punto de recuperación.
- No restaurar sobre producción sin aprobación explícita.

## 11. Monitoreo

Revisar:

- GitHub Actions;
- deployments y build logs de Vercel;
- errores y warnings de runtime;
- logs de cron;
- importaciones fallidas;
- alertas de seguridad Supabase;
- crecimiento de tablas de raw records y observaciones.

## 12. Procedimiento de release

1. Crear branch desde `main`.
2. Auditar archivos y esquema afectados.
3. Implementar commits pequeños.
4. Añadir pruebas.
5. Abrir PR.
6. Exigir CI exitoso y Preview `READY`.
7. Verificar logs de Preview.
8. Fusionar a `main`.
9. Confirmar Production `READY`.
10. Revisar errores de runtime.
11. Actualizar matriz y documentación.

## 13. QA por rol

El workflow manual `Authenticated role QA` requiere secretos `QA_*` en GitHub.

Criterios mínimos:

- CEO/admin: alcance global.
- Director/subdirector: oficina raíz y partners propios, sin compañía ni oficinas ajenas.
- Seller: única entidad vinculada a su perfil.
- Métricas, metas y alertas con `entity_id` dentro del conjunto visible.
- Valorizaciones y asignaciones dentro del alcance del perfil.

Conservar el artefacto JSON del workflow como evidencia.

## 14. Gestión de incidentes

1. Clasificar integridad, disponibilidad, confidencialidad o proveedor.
2. Contener sin borrar evidencia.
3. Rotar secretos si aplica.
4. Restaurar servicio estable.
5. Identificar causa raíz.
6. Registrar acciones y responsables.
7. Notificar conforme al contrato y política vigente.
8. Añadir una prueba que evite la regresión.
