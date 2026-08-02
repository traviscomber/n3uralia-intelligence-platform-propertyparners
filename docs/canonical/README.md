# Documentación canónica

`docs/canonical` es la única fuente documental normativa del proyecto.

Aquí deben vivir todos los documentos que definan comportamiento obligatorio, identidad visual, configuración, operación, generación de reportes y envío de comunicaciones.

## Documentos actuales

- `BRANDBOOK.md`: identidad visual, tokens y semántica cromática.
- `CONFIGURATION.md`: configuración operativa y variables requeridas.
- `EMAIL_DELIVERY.md`: reglas de generación, revisión y envío de correos.
- `CEO_MONTHLY_REPORT_WORKFLOW.md`: flujo de reportes mensuales del CEO.

## Regla de precedencia

Cuando exista conflicto entre código histórico, comentarios, presentaciones antiguas o documentación fuera de esta carpeta, prevalece el documento vigente dentro de `docs/canonical`, salvo que una fuente contractual o de datos explícitamente identificada tenga mayor autoridad.

## Criterio de incorporación

Debe añadirse aquí cualquier documento que defina:

- reglas permanentes del producto;
- identidad visual y experiencia de usuario;
- configuración de producción;
- seguridad y permisos;
- contratos de datos;
- generación de reportes;
- envío de correos y notificaciones;
- procedimientos de cierre mensual;
- integraciones con Vercel, Supabase, Resend u otros proveedores.

Los documentos temporales, notas de trabajo y borradores no son canónicos y deben permanecer fuera de esta carpeta hasta ser aprobados.
