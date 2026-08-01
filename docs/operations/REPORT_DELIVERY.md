# Operación de generación y entrega de reportes

## Separación de etapas

El flujo se divide en dos procesos idempotentes:

1. `management-monthly` genera un snapshot inmutable por programación y período.
2. `management-delivery` reclama destinatarios pendientes y entrega el PDF derivado de ese snapshot.

La entrega nunca recalcula las métricas. El documento representa exactamente la evidencia persistida en `management_report_runs.snapshot`.

## Configuración

Variables de Production requeridas:

- `CRON_SECRET`: autentica las dos rutas de Vercel Cron.
- `RESEND_API_KEY`: credencial privada del proveedor.
- `REPORT_FROM_EMAIL`: remitente verificado.
- `REPORT_REPLY_TO`: respuesta opcional.
- `APP_BASE_URL`: origen canónico para el enlace autenticado al PDF.

No registrar valores reales en Git, issues, logs o documentos.

## Programación

- Generación: día 1 de cada mes a las 09:00 UTC.
- Entrega: cada hora, minuto 0.

La ejecución manual está disponible para CEO y administración en `/dashboard/reportes/operacion`.

## Cola e idempotencia

`claim_management_report_distributions`:

- sólo puede ejecutarse con `service_role`;
- usa `FOR UPDATE SKIP LOCKED`;
- reclama máximo 100 filas por ejecución;
- recupera bloqueos `processing` con más de 15 minutos;
- excluye entregas terminales y filas con seis intentos;
- incrementa el contador al reclamar.

Cada solicitud al proveedor utiliza `Idempotency-Key: management-report-{distribution_id}` para reducir duplicados ante timeouts o reintentos.

## Reintentos

El backoff es exponencial:

1. 5 minutos;
2. 10 minutos;
3. 20 minutos;
4. 40 minutos;
5. 80 minutos;
6. máximo 24 horas.

Errores HTTP 4xx permanentes, excepto 408, 409 y 429, se marcan como terminales. Los terminales no regresan automáticamente a la cola.

## Estados

### Reporte

- `generated`: snapshot disponible.
- `distributed`: no quedan destinatarios pendientes, procesando o fallidos.
- `failed`: reservado para fallos de generación o proceso global.

### Distribución

- `pending`: lista para reclamar cuando llegue `next_attempt_at`.
- `processing`: bloqueada por un worker.
- `sent`: aceptada por el proveedor.
- `failed`: requiere reintento o revisión terminal.
- `acknowledged`: confirmación operacional posterior.

`sent` significa aceptación del proveedor, no prueba de lectura por el destinatario.

## PDF

El PDF incluye:

- tipo y período;
- identificador y fecha de generación;
- procedencia;
- entidades y métricas del snapshot;
- metas presentes en el snapshot;
- calidad y evaluación cuando existan;
- alertas incluidas;
- declaración metodológica.

Los valores nulos se presentan como `n/d`. El generador no imputa ceros ni crea proyecciones.

## Recuperación

1. Revisar `/dashboard/reportes/operacion`.
2. Confirmar si el proveedor está configurado.
3. Revisar `error_message`, `attempt_count` y `next_attempt_at`.
4. Corregir configuración o destinatario.
5. Para una fila terminal, retirar manualmente `metadata.terminalFailure` y ajustar `next_attempt_at` sólo con autorización y registro de cambio.
6. Ejecutar `Procesar entregas`.
7. Verificar `sent_at`, `provider_message_id` y logs de Vercel.

No eliminar distribuciones para forzar un reenvío; conservar el historial.

## Criterio de aceptación operacional

El flujo se considera operacional cuando existe evidencia de:

- `CRON_SECRET` válido;
- remitente verificado;
- una programación autorizada;
- reporte generado;
- PDF descargable;
- distribución `sent` con referencia del proveedor;
- prueba controlada de fallo y reintento;
- destinatario confirmado por el Cliente.
