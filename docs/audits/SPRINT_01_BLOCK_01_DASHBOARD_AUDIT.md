# Sprint 01 · Bloque 01 · Auditoría de dashboard

Fecha: 2026-08-03
Rama: `docs/contract-closeout`
PR: `#75`

## Alcance

Auditoría conjunta de Thor, Mi Toro y Travis Brutal sobre:

- dashboard principal;
- módulo de inteligencia de mercado;
- navegación contractual visible;
- confianza y procedencia de datos;
- exposición de errores técnicos.

La revisión se basa en el código del repositorio y el deployment asociado al commit. No sustituye una validación visual autenticada por rol.

## Hallazgos

### Alta · Detalles técnicos expuestos en interfaz

- Ruta: `/dashboard/market`
- Archivo: `app/dashboard/market/page.tsx`
- Evidencia: el mensaje visible concatenaba directamente `operational.error`.
- Impacto: podía revelar nombres internos, consultas, tablas o información de infraestructura al usuario final.
- Corrección: se reemplazó por un mensaje operativo genérico sin interpolar el error técnico.
- Estado: corregido; pendiente de build y deployment.

### Media · Validación visual autenticada pendiente

- Rutas: `/dashboard`, `/dashboard/market`, `/dashboard/valuation`, `/dashboard/control`.
- Evidencia: el código define jerarquía, estados de datos y rutas, pero no existe evidencia en este bloque de revisión visual autenticada por rol y viewport.
- Impacto: no permite aprobar todavía responsive, navegación real, estados vacíos y consistencia completa del brandbook.
- Recomendación: ejecutar QA visual autenticado para administrador, dirección y ejecutivo.
- Estado: pendiente.

### Media · Integridad de navegación debe quedar automatizada

- Evidencia: el dashboard enlaza módulos contractuales y exportaciones mediante rutas literales.
- Impacto: una ruta eliminada o renombrada puede dejar una acción visible sin destino válido.
- Recomendación: incorporar un verificador estático de rutas críticas del dashboard en `prebuild`.
- Estado: en ejecución.

## Evaluación por agente

### Thor

- Confirmó que los estados ausentes se presentan como no disponibles y no como estimaciones.
- Detectó exposición directa de detalles de error.
- Exige mantener mensajes públicos sanitizados y validación preventiva en CI.

### Mi Toro

- La pantalla comunica alcance, procedencia, frescura y limitaciones metodológicas.
- No se aprueba todavía la experiencia completa sin evidencia visual autenticada y responsive.
- Los estados de error deben orientar al usuario sin revelar infraestructura.

### Travis Brutal

- Ejecutó la corrección de exposición.
- Implementará un control automático de rutas y mensajes técnicos visibles.
- Mantendrá cambios pequeños, trazables y sin alterar datos de producción.

## Criterio de cierre del bloque

El bloque queda validado cuando:

1. el verificador preventivo pasa;
2. el build termina correctamente;
3. Vercel informa `success` o `READY` para el último commit;
4. no se exponen detalles técnicos en los mensajes revisados.

La aprobación visual completa queda fuera de este bloque hasta ejecutar QA autenticado.