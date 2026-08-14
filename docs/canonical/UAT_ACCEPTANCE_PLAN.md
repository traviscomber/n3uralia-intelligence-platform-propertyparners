# Plan de UAT y aceptación contractual

## Objetivo

Cerrar la aceptación funcional del proyecto mediante evidencia reproducible, observaciones específicas y responsables definidos. Este documento no reemplaza el contrato; organiza la validación de los entregables implementados.

## Alcance de aceptación

La UAT cubre:

1. Acceso, autenticación, perfiles, roles y capacidades.
2. Dashboard CEO, Dirección y operación comercial.
3. Inteligencia de mercado y fuentes disponibles.
4. Valorización, comparables, ajustes, rango y exportación.
5. Reportes ejecutivos, cierres mensuales y automatizaciones.
6. Documentos, trazabilidad, auditoría y evidencia.
7. Seguridad funcional: aislamiento por tenant, caché privada y ausencia de errores internos expuestos.

## Regla de evidencia

Cada caso debe registrar:

- identificador;
- módulo y ruta;
- rol utilizado;
- datos de entrada;
- resultado esperado;
- resultado observado;
- captura o referencia verificable;
- severidad si existe desviación;
- responsable;
- fecha;
- estado.

Estados permitidos:

- `pending`;
- `passed`;
- `failed`;
- `blocked-client-input`;
- `accepted-with-observation`.

## Casos mínimos

### UAT-01 Acceso y permisos

- Verificar inicio de sesión válido e inválido.
- Verificar acceso autorizado por capacidad.
- Verificar rechazo de un usuario sin capacidad.
- Verificar que una sesión no acceda a información fuera de su alcance.

### UAT-02 Dashboard CEO

- Verificar carga de indicadores ejecutivos.
- Verificar acciones, riesgos y señales autorizadas.
- Verificar que la API no exponga modo interno, procedencia técnica, errores remotos ni versión del modelo.

### UAT-03 CRM y gestión comercial

- Verificar datos acumulados, sucursales, ejecutivos y tareas.
- Verificar consistencia entre filtros y totales.
- Registrar como bloqueo cualquier KPI cuyo diccionario oficial no haya sido confirmado por el Cliente.

### UAT-04 Inteligencia de mercado

- Verificar fuentes, comparables y trazabilidad.
- Separar claramente dato interno, dato externo e inferencia.
- Registrar como `blocked-client-input` indicadores que dependan de CBR, ventas recientes, KML o reglas aún no entregadas.

### UAT-05 Valorización

- Crear o abrir un caso.
- Verificar comparables, ajustes, rango y justificación.
- Verificar exportación y registro de decisiones.

### UAT-06 Reporte mensual

- Verificar que el período predeterminado sea el último mes cerrado.
- Verificar que el mes actual y meses futuros sean rechazados.
- Verificar vista previa, asunto, destinatarios configurados y envío autorizado.

### UAT-07 Seguridad funcional

- Verificar respuestas sin stack traces ni mensajes crudos de base de datos.
- Verificar `Cache-Control: private, no-store` en superficies sensibles.
- Verificar que las rutas administrativas requieran sesión, capacidad o secreto cron válido.

### UAT-08 Continuidad operativa

- Verificar build de producción.
- Verificar deployment exitoso.
- Verificar rutas críticas sin errores de runtime.
- Verificar procedimiento de rollback documentado.

## Severidades

- `critical`: impide uso seguro o expone datos, secretos o acceso no autorizado.
- `high`: impide una función contractual principal.
- `medium`: desviación funcional con alternativa operativa.
- `low`: ajuste visual, texto o mejora no bloqueante.

## Criterio de cierre

La UAT puede cerrarse cuando:

- no existen hallazgos `critical` o `high` abiertos;
- los hallazgos `medium` aceptados tienen responsable y fecha;
- los bloqueos por insumos del Cliente están documentados;
- las rutas críticas pasan;
- el build y deployment de referencia están verdes;
- el Cliente firma el acta o emite aceptación inequívoca por el canal acordado.

## Acta de aceptación

Debe contener:

- versión y commit exacto;
- URL del deployment validado;
- fecha y participantes;
- casos ejecutados y resultado;
- observaciones aceptadas;
- bloqueos atribuibles a insumos pendientes;
- fecha de capacitación;
- firma o aceptación electrónica de las partes.
