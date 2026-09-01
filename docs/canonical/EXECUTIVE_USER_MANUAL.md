# Manual ejecutivo de uso — Property Partners Intelligence Platform

**Versión de entrega:** 2026-09-01  
**Sincronización UX:** PR #173 — navegación y superficies V1 orientadas a decisión  
**Producción:** `https://ppartnersgroup.app`  
**Alcance V1:** Inteligencia de Mercado, Valorización y Control de Gestión / Automatización de Reportes para ventas de casas en Vitacura.

## 1. Para qué sirve la plataforma

La plataforma concentra tres decisiones operativas:

1. **Entender el mercado** con evidencia territorial, Portal Inmobiliario y transacciones CBRS.
2. **Valorar una propiedad** mediante comparables, condición, evidencia trazable y revisión humana.
3. **Gestionar el negocio** mediante prioridades por rol, métricas, alertas y reportes.

La experiencia V1 aplica una regla simple: **primero situación y acción; después detalle, evidencia y metodología**. La profundidad técnica no se elimina, pero queda bajo disclosure para no sobrecargar la operación diaria.

La plataforma separa hechos persistidos, evidencia documental e inferencias. Un dato `n/d`, pendiente o no reconciliado no debe interpretarse como cero ni como hecho aprobado.

## 2. Acceso y roles

Roles vigentes:

- **CEO / admin:** visión global y operaciones ejecutivas autorizadas.
- **Director / subdirector:** alcance de su oficina y equipo.
- **Seller / ejecutivo:** alcance propio.

Si un usuario ve otra oficina, otro equipo o una valorización fuera de su alcance debe detener la operación y reportarlo como incidente de autorización.

## 3. Navegación principal

La navegación primaria se limita a las tareas diarias más frecuentes.

### CEO

- **Hoy** — `/dashboard/ceo`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Informes** — `/dashboard/reportes/canonicos`

Las funciones de administración permanecen en una sección secundaria: Gestión, Metas y alertas, Datos y metodología, Asignaciones, Usuarios y configuración.

### Director / subdirector

- **Hoy** — `/dashboard/director`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Informes** — `/dashboard/director/reporte`

### Seller / ejecutivo

- **Hoy** — `/dashboard/partner`
- **Mercado** — `/dashboard/market`
- **Valorizaciones** — `/dashboard/valuations`
- **Propiedades** — `/dashboard/properties`
- **Mi reporte** — `/dashboard/reportes/audiencias/ejecutivo`

## 4. Hoy — vista ejecutiva

La vista **Hoy** debe responder primero qué necesita atención.

Para CEO, la pantalla prioriza:

- situación general del negocio;
- ventas, meta y cumplimiento;
- valorizaciones esperando revisión;
- hasta tres prioridades operativas derivadas de datos reales.

La evidencia, metodología, gobernanza e información técnica siguen disponibles bajo **“Ver evidencia, metodología y gobernanza”**.

Uso recomendado:

1. leer el estado del período;
2. revisar las prioridades mostradas;
3. abrir la acción correspondiente;
4. sólo después consultar evidencia/metodología cuando sea necesaria para decidir o auditar.

El diccionario final de KPI sigue siendo una dependencia compartida de cierre. No presentar como KPI oficial una métrica cuya definición aún no haya sido aprobada por Property Partners.

## 5. Inteligencia de Mercado V1

Ruta principal: `/dashboard/market`.

La superficie principal se concentra en **Vitacura · Casas** y muestra cuatro indicadores de decisión:

- oferta activa;
- ventas confirmadas;
- días en mercado;
- absorción.

La sección principal puede destacar excepciones como mercado desactualizado, matches pendientes o barrios sin cobertura. La información completa de fuentes, cobertura territorial, KML, reconciliación y exportación queda bajo **“Ver datos y metodología”**.

Fuentes canónicas integradas al corte de entrega:

- **CBRS:** transacciones de referencia.
- **Property Partners KML:** barrios/polígonos territoriales.
- **Portal Inmobiliario:** casas en venta en Vitacura mediante refresh operacional V1.

### Regla de alcance

Departamentos y proyectos no forman parte del alcance operativo V1 de aceptación. Se consideran V2 y no bloquean esta entrega.

### Cómo interpretar la información

- verificar siempre fecha/corte y cobertura;
- una identidad candidata no equivale a propiedad confirmada;
- discrepancias de ROL se rechazan;
- conflictos de barrio reducen la confianza de reconciliación;
- PRC, jerarquía vial y otras capas de investigación son evidencia contextual/no vinculante salvo que el producto indique lo contrario;
- la inteligencia de mercado no modifica automáticamente los pesos oficiales del modelo de valorización.

## 6. Valorizaciones

Registro principal: `/dashboard/valuations`.  
Creación de un nuevo caso: `/dashboard/valuation`.

La vista de Valorizaciones prioriza **“Qué necesita avanzar”**:

- casos en revisión;
- borradores;
- aprobadas;
- emitidas;
- una siguiente acción concreta cuando existe un caso pendiente.

El registro completo, filtros y búsqueda quedan bajo **“Ver todas las valorizaciones”**.

### Flujo de negocio

1. crear expediente y completar atributos de la propiedad;
2. revisar condición, ubicación y evidencia disponible;
3. seleccionar **mínimo 3 comparables aceptados**;
4. documentar inclusiones/exclusiones y justificación;
5. guardar/enviar a revisión;
6. reviewer/director revisa y puede devolver observaciones según su alcance;
7. el expediente corregido vuelve a revisión;
8. **la aprobación/emisión final corresponde al CEO autorizado**;
9. una versión `issued` queda congelada como snapshot trazable.

### Estados principales

- `draft`: expediente en preparación;
- `review`: listo/en proceso de revisión;
- `approved`: aprobación autorizada previa a emisión cuando corresponda al workflow;
- `issued`: versión emitida e inmutable para efectos de reporte/auditoría.

No usar un caso en `draft` o `review` como informe final emitido.

El valor es una decisión asistida por evidencia y revisión profesional; no debe presentarse como tasación legal o certeza automática.

## 7. Propiedades

Ruta principal: `/dashboard/properties`.

La vista **Mi cartera** prioriza:

- propiedades asignadas;
- identidades pendientes cuando el rol puede gestionarlas;
- propiedades cuya vigencia necesita revisión;
- acceso directo al detalle de cada propiedad.

En móvil la cartera se presenta como bloques operativos; en escritorio puede utilizar una tabla compacta. El estado de datos y cobertura de identidad queda en una sección secundaria.

## 8. Control de Gestión

### Metas y alertas

Ruta: `/dashboard/control/admin`.

La pantalla abre con **“Qué requiere decisión”** y prioriza:

- alertas críticas;
- alertas abiertas;
- cobertura de metas;
- reglas activas.

Se muestran primero hasta tres prioridades. Acciones principales: **Revisar, Resolver o Descartar**. La edición de metas y la configuración de evidencia/reglas permanecen en secciones secundarias.

### Cierre del período

Ruta: `/dashboard/control/operations`.

La pantalla responde **“Qué falta para cerrar”**. El sistema orienta la siguiente acción según el estado real:

- si existen filas rechazadas, revisar reconciliación;
- si no existen cargas del período, no generar cierre;
- si hay datos válidos y aún no hay reporte, evaluar alertas y preparar cierre;
- si ya existe reporte, abrir el último reporte disponible.

El reporte mensual no debe generarse mientras falte evidencia del período o existan rechazos de datos pendientes.

La ingestión técnica y carga JSON permanecen bajo **“Operación técnica de datos”**.

## 9. Informes

Ruta ejecutiva principal: `/dashboard/reportes/canonicos`.

La superficie visible prioriza el último entregable, su estado y las acciones **Abrir / Descargar**. Detalles de trazabilidad como modelo, versión de prompt, fuentes o costo permanecen bajo **“Ver trazabilidad”** cuando correspondan.

Antes de activar una distribución recurrente deben aprobarse:

- calendario;
- destinatarios;
- frecuencia;
- formato/canal;
- responsable de revisión.

Un estado `pending` no prueba que un correo haya sido entregado.

## 10. Qué no debe hacerse

- compartir credenciales;
- aprobar datos o KPI no confirmados como si fueran oficiales;
- alterar manualmente un snapshot emitido y presentarlo como generado por la plataforma;
- usar una propiedad candidata/no reconciliada como identidad confirmada;
- emitir una valorización sin el workflow autorizado;
- generar un cierre mensual con evidencia faltante o rechazos no resueltos;
- copiar secretos, tokens o service-role keys a chats, correos o documentos de entrega.

## 11. Qué hacer ante un problema

Registrar:

- fecha/hora;
- usuario y rol, sin contraseña;
- URL/ruta;
- acción realizada;
- mensaje visible;
- ID de caso/reporte/importación cuando exista;
- captura sin datos sensibles innecesarios.

Seguir `docs/canonical/SUPPORT_AND_INCIDENT_RUNBOOK.md`.

## 12. Estado de aceptación

La plataforma está técnicamente en condición **ready-for-UAT**. La aceptación final requiere todavía:

- prueba autenticada con participantes designados;
- un ciclo real autorizado de Valorizador hasta `issued`;
- aprobación del diccionario KPI y reglas de reporting;
- capacitación/handover;
- registro de aceptación del Cliente.

Este manual describe la experiencia V1 de la rama de entrega que contiene PR #173. Debe congelarse contra el commit finalmente aceptado en `main` antes de emitir el paquete contractual definitivo.

Este manual no sustituye los actos formales de aceptación.