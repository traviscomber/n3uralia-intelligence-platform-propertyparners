# Módulo III — Checklist de aceptación

Estado: implementación técnica completada; aceptación funcional pendiente de datos reales y firma del cliente.

## Seguridad y perfiles
- [x] Autenticación requerida en APIs de gestión.
- [x] Vistas separadas para CEO, dirección/subdirección y partner/agente.
- [x] RLS habilitado en entidades, métricas, metas, alertas, importaciones, reportes, programaciones y distribuciones.
- [x] Escritura administrativa limitada por rol.
- [ ] Validación con usuarios reales de cada perfil.

## Métricas y trazabilidad
- [x] Definiciones de métricas centralizadas.
- [x] Valores por entidad y período.
- [x] Fuente, referencia, período y calidad registrados.
- [x] Comparación mensual y anual.
- [x] Metas y cumplimiento.
- [ ] Conciliación final contra CRM y planillas oficiales.

## Alertas
- [x] Reglas configurables.
- [x] Evaluación automática.
- [x] Prevención de duplicados abiertos.
- [x] Resolución automática al dejar de cumplirse la condición.
- [x] Reconocimiento, resolución y descarte manual.
- [ ] Aprobación de umbrales y responsables por Property Partners.

## Importaciones
- [x] Importación masiva validada.
- [x] Registro de ejecución y rechazos.
- [x] Evaluación de alertas posterior a importación.
- [ ] Carga de fuentes reales de producción.
- [ ] Prueba de recuperación ante carga parcial o archivo inválido.

## Reportes y automatización
- [x] Snapshots inmutables.
- [x] Reportes ejecutivo, oficina, partner, mensual y acumulado.
- [x] Vista imprimible y guardado como PDF desde navegador.
- [x] Programaciones mensuales, trimestrales y anuales.
- [x] Registro de destinatarios y estado de distribución.
- [x] Cron mensual protegido por `CRON_SECRET`.
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Vercel.
- [ ] Integrar proveedor de correo; actualmente la distribución queda registrada como pendiente/manual.
- [ ] Prueba controlada de ejecución automática en producción.

## Criterio de cierre
El módulo puede considerarse técnicamente listo cuando el deployment esté en estado `READY` y las variables seguras estén configuradas. Solo puede considerarse aceptado cuando las fuentes reales estén conciliadas, los umbrales estén aprobados, la automatización haya sido probada y exista acta de aceptación del cliente.
