# Configuración temporal de Resend con ppartnersgroup.app

## Identidad activa

- Dominio transaccional: `ppartnersgroup.app`.
- Remitente central: `Property Partners Intelligence <reportes@ppartnersgroup.app>`.
- Aplicación: `https://n3uralia-intelligence-platform.vercel.app`.

El dominio de correo y la URL de la aplicación son independientes. La aplicación puede continuar en `vercel.app` mientras Resend autentica el dominio `ppartnersgroup.app` para el campo `From`.

## Resend

1. Confirmar que `ppartnersgroup.app` figure como `Verified`.
2. Confirmar DKIM y SPF sin modificar los registros de recepción existentes.
3. Crear una API key restringida al envío de este proyecto.
4. No registrar la API key en GitHub, documentación o logs.

## Vercel Production

Configurar en el proyecto `n3uralia-intelligence-platform`:

```env
RESEND_API_KEY=<secret>
REPORT_FROM_EMAIL=Property Partners Intelligence <reportes@ppartnersgroup.app>
REPORT_ALLOWED_FROM_DOMAINS=ppartnersgroup.app
APP_BASE_URL=https://n3uralia-intelligence-platform.vercel.app
REPORT_REPLY_TO=<buzon-operativo-real-opcional>
```

`REPORT_FROM_EMAIL` puede omitirse porque el código usa el mismo remitente como valor predeterminado. Se mantiene explícito en Vercel para facilitar auditoría operativa.

## Prueba canario

1. Crear una programación con un destinatario controlado.
2. Generar el snapshot y descargar el PDF.
3. Procesar una sola entrega.
4. Confirmar `sent`, `provider_message_id` y `sent_at`.
5. Ejecutar nuevamente el worker y confirmar que no duplica el envío.
6. Revisar el encabezado `From` recibido y comprobar `reportes@ppartnersgroup.app`.
7. Confirmar que `Reply-To`, cuando exista, apunta a una bandeja atendida.

## Cambio futuro

Cuando Property Partners apruebe el dominio corporativo definitivo, actualizar `REPORT_ALLOWED_FROM_DOMAINS` y `REPORT_FROM_EMAIL`. No se requiere cambiar la cola, los snapshots ni el generador PDF.
