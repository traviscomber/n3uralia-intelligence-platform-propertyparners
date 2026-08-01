# Manual de usuario por rol

Fecha: 1 de agosto de 2026.

## 1. Principios comunes

La plataforma separa tres capas de información:

- **Persistida aprobada**: valor reconciliado y autorizado para publicación.
- **Documental**: corte proveniente de presentaciones canónicas, identificado con período y fuente.
- **Operacional**: valorizaciones, asignaciones, tareas y datos de mercado sujetos a RLS.

Reglas de interpretación:

- `n/d` significa que no existe evidencia suficiente; no equivale a cero.
- Una propiedad candidata no es una identidad confirmada.
- Una distribución `pending` no prueba que un correo haya sido entregado.
- Una valorización es orientativa y requiere el workflow de revisión/aprobación.
- Los rankings y umbrales provisionales no reemplazan una regla aprobada por el Cliente.

## 2. Acceso

1. Abrir la URL productiva autorizada.
2. Iniciar sesión con la cuenta corporativa asignada.
3. Verificar que el encabezado corresponda al rol y oficina esperados.
4. Cerrar sesión al usar un equipo compartido.

Ante acceso a una oficina, persona o caso ajeno, detener el uso y reportarlo como incidente de autorización.

## 3. CEO y administración ejecutiva

### Vista principal

Ruta: `/dashboard/ceo`.

Permite revisar:

- resultado mensual y acumulado;
- oficinas y partners;
- metas y cumplimiento;
- comparación mensual e interanual;
- riesgos derivados;
- valorizaciones pendientes;
- tareas, asignaciones e identidad de mercado.

### Lectura de métricas

1. Revisar el período visible.
2. Abrir la metodología y procedencia.
3. Confirmar si la métrica es persistida aprobada o documental.
4. No comparar métricas de períodos diferentes sin revisar `periodStart` y `periodEnd`.
5. Tratar alertas derivadas de umbrales provisionales como apoyo, no como sanción automática.

### Decisiones

- Abrir valorizaciones en revisión.
- Priorizar tareas vencidas o urgentes.
- Revisar asignaciones pausadas.
- Revisar backlog de identidad antes de usar una propiedad como evidencia definitiva.

### Reportes

- Consultar reportes en `/dashboard/reportes/autonomos`.
- Crear programaciones sólo con destinatarios autorizados.
- La generación manual de reportes vencidos está restringida a CEO/admin.
- Verificar el estado de distribución; `pending` exige una acción manual o proveedor de correo.

## 4. Director y subdirector

### Vista principal

Ruta: `/dashboard/director`.

El alcance debe limitarse a una oficina y sus partners.

Funciones:

- revisar desempeño de oficina y equipo;
- consultar valorizaciones de perfiles bajo alcance;
- aprobar, devolver o emitir según permisos acordados;
- gestionar asignaciones y tareas;
- consultar reportes y mercado.

### Control de aislamiento

Antes de operar:

1. Confirmar el nombre de la oficina en el encabezado.
2. Confirmar que no aparezcan partners de otra oficina.
3. Confirmar que valorizaciones y asignaciones pertenezcan al equipo visible.

Cualquier desviación se considera un fallo de RLS o perfil y debe reportarse.

### Valorizaciones

- `draft`: expediente editable por su responsable.
- `review`: listo para revisión con evidencia suficiente.
- `approved`: aprobado por rol autorizado.
- `issued`: versión emitida y congelada para informe.

No aprobar si faltan comparables, fuente, fecha, distancia, ajustes o justificación.

## 5. Partner o agente

### Vista principal

Ruta: `/dashboard/partner`.

El partner debe ver únicamente:

- su ficha y métricas;
- sus propiedades asignadas;
- sus valorizaciones;
- sus tareas;
- mercado permitido por la aplicación.

### Flujo de valorización

1. Abrir `/dashboard/valuation`.
2. Registrar dirección, tipología, superficies y atributos.
3. Registrar barrio, área homogénea, ROL y coordenadas cuando estén disponibles.
4. Incorporar comparables con fuente, fecha, distancia y precio.
5. Excluir un comparable sólo con motivo.
6. Guardar como borrador.
7. Enviar a revisión cuando cumpla los mínimos definidos.
8. Corregir observaciones sin eliminar el historial previo.

El partner no puede aprobar ni emitir un caso.

### Tareas y asignaciones

- Revisar estado, prioridad y fecha de vencimiento.
- Registrar avance y resolución con detalle verificable.
- No modificar asignaciones de otros perfiles.

## 6. Inteligencia de Mercado

Ruta: `/dashboard/market`.

### Indicadores

- Revisar fecha de observación y cobertura.
- Confirmar si ventas e inventario corresponden al mismo período.
- No interpretar absorción, velocidad u oferta/ventas cuando se muestran como `n/d`.

### Exportaciones

- CSV/XLSX: datos tabulares bajo el alcance del usuario.
- PDF: vista operacional imprimible.
- Verificar que filtros, período y conteos coincidan con la pantalla.

### Reconciliación

- `confirmed`: identidad aceptada.
- `candidate` o pendiente: requiere revisión.
- `rejected`: no usar como identidad.

## 7. Reportes y presentaciones

- El reporte debe conservar tipo, entidad, período, fuentes y fecha de generación.
- Guardar como PDF desde la vista imprimible cuando corresponda.
- No editar manualmente un reporte y presentarlo como snapshot generado sin identificar el cambio.
- PowerPoint o archivo editorial sólo se considera entregado cuando exista archivo generado y verificado.

## 8. Mensajes de error

### `401 No autorizado`

La sesión no existe, expiró o la automatización no presentó su secreto.

### `403 Sin permisos`

La cuenta está autenticada, pero la acción está fuera de su rol o alcance.

### `n/d` o falta de datos

La fuente o período no está disponible o aprobado. No reintentar cargas sin identificar la causa.

### Error de importación

Revisar:

- sistema y dataset compatibles;
- autorización de la fuente;
- campos obligatorios;
- período común;
- IDs de entidad y métrica;
- errores por fila.

## 9. Soporte e incidentes

Al reportar un problema incluir:

- fecha y hora;
- usuario y rol, sin contraseña;
- URL o ruta;
- acción realizada;
- mensaje exacto;
- captura sin datos personales innecesarios;
- ID de caso, reporte o importación cuando exista.

No enviar claves, tokens ni service role keys por correo o chat.
