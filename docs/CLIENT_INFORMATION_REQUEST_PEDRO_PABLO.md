# Solicitud canónica de información pendiente — Pedro Pablo

Fecha: 9 de agosto de 2026  
Proyecto: N3uralia Intelligence Platform — Property Partners  
Destinatario: Pedro Pablo  
Estado: Pendiente de respuesta del Cliente

## Objetivo

Este documento contiene únicamente preguntas cuya respuesta no se encuentra de forma suficiente en la data canónica disponible o requiere aprobación formal del Cliente. N3uralia no completará estos puntos mediante supuestos, datos simulados ni reglas inventadas.

Cada respuesta recibida debe quedar respaldada por correo, archivo, acta, documento aprobado o registro equivalente y luego incorporarse al manifiesto `config/client-dependencies-status.json` como evidencia.

## 1. Inteligencia de mercado

### PP-MKT-01 — Fuente oficial de compraventas

¿Cuál es la fuente oficial que debemos usar para las compraventas históricas y ventas recientes: archivo CBR/CBRS, proveedor externo, planilla interna u otra fuente?

**Necesitamos:** nombre de la fuente y responsable.  
**Bloquea:** transacciones confirmadas, comparables vendidos, velocidad de venta, absorción y validación final de mercado.

### PP-MKT-02 — Archivo o acceso a compraventas

¿Nos puedes entregar el archivo o acceso autorizado a esa fuente, indicando desde qué fecha debe cubrir datos y con qué periodicidad se actualizará?

**Necesitamos:** archivo/acceso, fecha inicial de cobertura y frecuencia de actualización.  
**Bloquea:** activación productiva del pipeline de ventas reales y UAT de mercado/valorización.

### PP-MKT-03 — KML/KMZ oficial

¿Existe un KML/KMZ oficial de barrios, microbarrios o zonas comerciales que Property Partners quiera usar como delimitación canónica?

**Responder:** Sí / No.  
**Bloquea:** cierre territorial definitivo.

### PP-MKT-04 — Entrega del KML/KMZ

Si existe, ¿nos puedes entregar el archivo final y confirmar cuál es la versión vigente?

**Necesitamos:** archivo y versión/fecha.  
**Bloquea:** asignación geográfica reproducible y validación final de cobertura.

## 2. Control de gestión y KPI

### PP-KPI-01 — Captación bruta

¿Cuál es la definición oficial de captación bruta y cuál es su fuente de datos?

**Necesitamos:** definición, unidad, fuente, periodicidad y nivel de cálculo: compañía/oficina/partner.  
**Bloquea:** KPI de captaciones y cumplimiento asociado.

### PP-KPI-02 — Conversión

¿Cómo se calcula oficialmente la conversión: numerador, denominador, cohorte, período y universo considerado?

**Necesitamos:** fórmula exacta y reglas de inclusión/exclusión.  
**Bloquea:** KPI de conversión y comparaciones entre períodos.

### PP-KPI-03 — Productividad

¿Cuál es la fórmula oficial de productividad y qué variables o ponderaciones utiliza?

**Necesitamos:** fórmula exacta, pesos si existen y período de evaluación.  
**Bloquea:** KPI de productividad.

### PP-KPI-04 — Rankings

¿Cómo debe construirse el ranking de oficinas y partners, incluyendo desempates y período de vigencia?

**Necesitamos:** KPI base, orden, desempates, alcance y frecuencia.  
**Bloquea:** ranking oficial en dashboard e informes.

### PP-KPI-05 — Alertas

¿Qué alertas comerciales necesitan, cuáles son sus umbrales, severidad, responsable y regla de escalamiento?

**Necesitamos por alerta:** nombre, condición, umbral, severidad, responsable, escalamiento y vigencia.  
**Bloquea:** activación oficial del motor de alertas.

### PP-KPI-06 — Metas

¿Cuáles son las metas oficiales por compañía, oficina y partner para los KPI aplicables, y desde qué período rigen?

**Necesitamos:** archivo o tabla con entidad, KPI, meta, unidad, período inicial y período final si corresponde.  
**Bloquea:** cumplimiento de metas y comparaciones oficiales.

## 3. Usuarios y permisos

### PP-USR-01 — Usuarios finales

¿Nos puedes entregar el listado final de usuarios que participarán en la plataforma con nombre, email, rol y oficina/partner asociado?

**Formato sugerido:** Nombre | Email | Rol | Oficina/Partner | Activo Sí/No.  
**Bloquea:** UAT autenticado y capacitación final.

### Roles finales — RESUELTO 9 de agosto de 2026

El modelo canónico confirmado es:

- **Admin:** Travis / N3uralia. Es administración técnica del sitio y no forma parte de la jerarquía organizacional de Property Partners.
- **CEO:** Pedro Pablo.
- **Directores:** directores de cuenta.
- **Ejecutivos:** usuarios operativos/comerciales dependientes de su alcance correspondiente.

La implementación técnica mantiene la equivalencia `admin -> ceo -> director -> seller/executive`. La antigua pregunta `PP-USR-02` queda cerrada y ya no requiere respuesta de Pedro Pablo.

## 4. Informes automáticos

### PP-RPT-01 — Calendario

¿Qué informes deben enviarse automáticamente, con qué frecuencia y en qué día/hora?

**Formato sugerido:** Informe | Frecuencia | Día | Hora | Zona horaria.  
**Bloquea:** activación definitiva de schedules productivos.

### PP-RPT-02 — Destinatarios

¿Quiénes son los destinatarios autorizados de cada informe y qué alcance debe recibir cada uno: global, oficina o personal?

**Formato sugerido:** Informe | Nombre | Email | Alcance.  
**Bloquea:** distribución automática real.

### PP-RPT-03 — Formato y canal

¿Confirman PDF como formato oficial de entrega y email como canal principal, o requieren además otro formato/canal contractual?

**Necesitamos:** aprobación o detalle de formatos/canales adicionales.  
**Bloquea:** cierre funcional del módulo de distribución.

## 5. UAT y aceptación

### PP-UAT-01 — Responsable y participantes

¿Quién será el responsable de aceptación UAT por parte de Property Partners y qué usuarios participarán por cada rol?

**Necesitamos:** responsable principal y participantes CEO/director/ejecutivo.  
**Bloquea:** aceptación funcional formal.

### PP-UAT-02 — Fecha UAT

¿Qué fecha o ventana proponen para ejecutar la sesión final de UAT?

**Necesitamos:** fecha o rango de fechas.  
**Bloquea:** firma/cierre de aceptación.

## 6. Capacitación y transferencia

### PP-TRN-01 — Participantes de capacitación

¿Qué personas deben recibir capacitación de usuario y quién quedará como administrador operativo de la plataforma?

**Necesitamos:** nombres, roles y administrador receptor.  
**Bloquea:** evidencia contractual de capacitación.

### PP-TRN-02 — Fecha de capacitación

¿Qué fecha o ventana proponen para la capacitación final?

**Necesitamos:** fecha o rango de fechas.  
**Bloquea:** cierre del traspaso operativo.

## 7. Servicios de terceros y transferencia técnica

### PP-OPS-01 — Titularidad y costos

¿A nombre de quién deben quedar finalmente las cuentas y costos recurrentes de Vercel, Supabase, Resend y cualquier proveedor externo de datos?

**Formato sugerido:** Servicio | Titular | Responsable de pago | Responsable técnico.  
**Bloquea:** paquete contractual de transferencia y responsabilidades posteriores.

### PP-OPS-02 — Receptor técnico

¿Quién será el receptor técnico autorizado para la transferencia de accesos, documentación y prueba de reconstrucción independiente?

**Necesitamos:** nombre, cargo y email del receptor técnico.  
**Bloquea:** clean-room deployment y aceptación de transferencia.

## Respuesta mínima para destrabar la entrega

Para acelerar el cierre, Pedro Pablo puede responder este documento directamente manteniendo los IDs `PP-*`. Cuando una respuesta requiera archivo, debe adjuntarse indicando el ID correspondiente.

Una respuesta se considera cerrada sólo cuando exista evidencia suficiente para convertir el ítem desde `pending` a `received`, `approved` o `waived` en el manifiesto canónico. La plataforma no asumirá que silencio, una conversación informal o una interpretación técnica equivalen a aprobación del Cliente.
