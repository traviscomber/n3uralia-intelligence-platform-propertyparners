# Envío canónico de correos

Este documento define cómo deben generarse, revisarse y enviarse los correos ejecutivos de la plataforma.

## Proveedor

El proveedor autorizado es Resend. No se debe sustituir por Gmail ni por envíos manuales fuera del flujo definido.

## Fuente del contenido

La vista previa y el correo deben utilizar exactamente el mismo HTML generado por el mismo módulo.

Para reportes mensuales:

- Vista previa: `app/api/management/reports/preview/route.ts`
- Envío: `app/api/cron/send-ceo-report-brandbook/route.ts`
- Flujo: `docs/canonical/CEO_MONTHLY_REPORT_WORKFLOW.md`

## Reglas antes del envío

1. Validar el período.
2. Confirmar que los datos coinciden con la fuente canónica disponible.
3. Revisar la vista previa.
4. Confirmar que el acumulado termina en el mes solicitado.
5. Verificar colores semánticos y brandbook.
6. Confirmar destinatario y asunto.
7. Obtener solicitud o aprobación del CEO.

## Reglas de envío

- Remitente autorizado: dominio `ppartnersgroup.app` configurado en Resend.
- Asunto mensual: `Control de Gestión — Cierre <Mes> <Año>`.
- No se debe enviar automáticamente sin autorización explícita del CEO.
- El identificador retornado por Resend debe conservarse para trazabilidad.
- No se debe afirmar entrega final solo porque la solicitud de envío fue aceptada.
- El estado `delivered` indica aceptación por el servidor receptor, no garantiza ubicación en bandeja de entrada.

## Seguridad

- `RESEND_API_KEY` debe permanecer en variables de entorno.
- Las rutas de cron deben protegerse mediante `CRON_SECRET` u otro control aprobado.
- No se deben exponer secretos, encabezados de autorización ni identificadores internos innecesarios.
- Las rutas de envío no deben quedar públicamente ejecutables sin autenticación.

## Cambios

Todo cambio en proveedor, remitente, rutas, asuntos, autorización o trazabilidad debe actualizar este documento en el mismo PR que modifica el código.
