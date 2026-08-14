# Configuración canónica

Este documento registra las reglas de configuración del proyecto. No debe contener secretos ni valores sensibles.

## Entornos

- Producción: Vercel, rama `main`.
- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`.
- Base de datos: Supabase.
- Proveedor de correo: Resend.

## Variables requeridas

Las variables sensibles deben existir únicamente en el gestor de variables del entorno correspondiente.

- `RESEND_API_KEY`: autorización del proveedor de correo.
- `CRON_SECRET`: protección de rutas de ejecución programada.
- Variables de conexión de Supabase requeridas por la aplicación.

Nunca se deben escribir valores reales de secretos en documentación, commits, respuestas API, logs o vistas previas.

## Reglas de despliegue

- `main` representa producción.
- Cada cambio en `main` puede activar un deployment de producción en Vercel.
- Los cambios documentales o funcionales deben pasar por PR cuando requieran revisión.
- No se debe declarar un cambio desplegado hasta que Vercel indique estado `READY`.
- Si el deployment queda en `ERROR`, deben revisarse los build logs antes de continuar.

## Fuentes de configuración

- Tokens visuales: `app/globals.css`.
- Generación mensual: `lib/ceo-report-april-layout-v2.ts` y adaptadores mensuales aprobados.
- Vista previa: `app/api/management/reports/preview/route.ts`.
- Envío de reportes: `app/api/cron/send-ceo-report-brandbook/route.ts`.

## Principio de consistencia

La configuración documentada aquí debe coincidir con el comportamiento real del código y del entorno. Cuando cambie una ruta, proveedor, variable requerida o contrato de despliegue, este documento debe actualizarse en el mismo PR.
