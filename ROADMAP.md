# Property Partners — Roadmap contractual de cierre

Última actualización: 16 de agosto de 2026

## Objetivo

Cerrar y entregar la plataforma contractual de Property Partners sobre los tres pilares comprometidos:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión y Automatización de Reportes.

Este documento reemplaza como plan operativo vigente el roadmap experimental de 8 semanas del 27 de julio de 2026. Las capacidades retiradas o fuera del alcance contractual no deben reintroducirse para cerrar la entrega.

## Estado ejecutivo

| Pilar | Estado técnico | Estado de cierre |
|---|---|---|
| Valorización de Propiedades | PASS | Listo para UAT/aceptación |
| Inteligencia de Mercado | PASS | Listo para UAT/aceptación |
| Control de Gestión + Reportes | PASS técnico | Espera definiciones de negocio para activar recurrencia |

Baseline técnico después de los cierres de Market Intelligence y Management Reports: `main` posterior a PR #110 y PR #111.

## Principios de ejecución

1. La propuesta comercial, contrato, anexos y documentación canónica del cliente mandan sobre roadmaps históricos.
2. No inventar KPI, metas, umbrales, destinatarios, periodicidades, políticas ni datos faltantes.
3. Datos de oferta, ventas confirmadas, históricos y referencias deben mantenerse semánticamente separados.
4. Todo cambio productivo debe pasar preview/gate, merge controlado, deployment `READY`, runtime scan y rollback verificable.
5. Las dependencias del cliente se documentan como dependencias; no se simulan para declarar cierre.
6. Un pilar sólo se considera cerrado cuando existe evidencia técnica y aceptación/UAT correspondiente.

---

## Fase 1 — Cierre técnico de los tres pilares

### 1. Valorización de Propiedades — PASS

Criterios ya cumplidos:

- búsqueda canónica de propiedad;
- flujo guiado de 5 pasos;
- mínimo de 3 comparables seleccionados por humano;
- cálculo determinístico y trazable;
- workflow vendedor → revisión → dirección → CEO → emisión;
- snapshots históricos inmutables con hash de integridad;
- reporte emitido desde el snapshot exacto de la versión;
- regresión completa del valorizador verde.

Pendiente de cierre comercial:

- UAT de negocio con Property Partners;
- registro de aceptación o defectos de negocio.

### 2. Inteligencia de Mercado — PASS

Criterios ya cumplidos:

- Portal live para departamentos, casas y proyectos;
- ingestión canónica `ingest_portal_listing_snapshot_v2`;
- refresh fail-closed por dataset;
- CBRS consolidado y separado de oferta;
- KML/barrios y territorialidad;
- inteligencia oferta vs ventas;
- trazabilidad, raw evidence, frescura y calidad;
- sin creación paralela de identidades canónicas;
- ingestión real service-role validada;
- producción y rollback verificados.

Pendiente de cierre comercial:

- UAT del dashboard de mercado;
- validar con Property Partners que filtros, barrios, nomenclatura y vistas sean suficientes para operación diaria;
- registrar como N/D cualquier métrica que no tenga evidencia oficial suficiente.

### 3. Control de Gestión + Automatización de Reportes — PASS técnico

Criterios técnicos cumplidos:

- scoring y reglas determinísticas;
- métricas persistidas y reconciliación;
- publicación sólo de valores aprobados;
- reportes desde snapshots persistidos;
- PDF y delivery con trazabilidad;
- retries, idempotencia y recuperación de workers;
- límites de acceso por rol;
- scheduling protegido;
- activación fail-closed si KPI o reglas de reporting están pendientes;
- destinatarios sintácticamente válidos obligatorios;
- runtime vuelve a verificar aprobaciones antes de ejecutar.

Dependencias de negocio pendientes:

- aprobación del diccionario oficial de KPI;
- metas, umbrales, rankings y reglas definitivas;
- calendario de reportes;
- destinatarios;
- periodicidad/canal/hora/formato cuando corresponda.

Regla de cierre: el motor puede entregarse técnicamente listo aunque la recurrencia permanezca deliberadamente bloqueada hasta recibir estas definiciones.

---

## Fase 2 — Gate transversal de producto

Antes de declarar los tres pilares listos para aceptación final:

- build y TypeScript verdes;
- deployment de producción `READY`;
- runtime errors P0/P1 = 0 en rutas críticas;
- rollback candidate disponible;
- permisos y RLS verificados en superficies críticas;
- estados loading/empty/error/disabled revisados;
- responsive desktop/tablet/mobile en flujos principales;
- accesibilidad básica de navegación, foco y controles;
- formatos de fecha, UF y números consistentes;
- no mocks, datos demo o placeholders presentados como reales;
- documentación de cualquier P2/P3 no bloqueante.

GitHub Actions bloqueados antes de ejecución por infraestructura/billing no sustituyen el gate: usar Vercel preview + verificadores determinísticos + runtime + Supabase como gate de reemplazo documentado.

---

## Fase 3 — UAT Property Partners

Ejecutar UAT con casos representativos y usuarios autorizados.

### Valorización

- crear caso real;
- confirmar sujeto;
- seleccionar 3 comparables;
- revisar cálculo y ajustes;
- devolver/corregir/re-enviar;
- aprobar y emitir;
- verificar PDF e historial.

### Mercado

- revisar inventario actual;
- consultar departamentos, casas y proyectos;
- revisar barrio/KML;
- comparar oferta vs ventas CBRS;
- abrir detalle/comparables;
- validar estados sin datos y frescura.

### Gestión/Reportes

- revisar CEO, dirección/subdirección y partner;
- verificar métricas y procedencia;
- revisar reconciliaciones;
- generar reporte manual;
- validar PDF;
- probar distribución controlada cuando existan destinatarios aprobados;
- comprobar que programación recurrente siga bloqueada mientras falten definiciones.

Salida de fase:

- defectos P0/P1 = 0;
- observaciones P2/P3 registradas;
- aceptación por módulo o lista cerrada de correcciones.

---

## Fase 4 — Definiciones del cliente

Cerrar explícitamente las dependencias que N3uralia no debe inventar:

1. Diccionario KPI oficial.
2. Metas y umbrales.
3. Reglas de ranking/alertas.
4. Calendario y periodicidad de reportes.
5. Destinatarios y responsables.
6. Criterios y representantes de aceptación UAT.
7. Política de retención/archivo/eliminación si aplica.
8. Política de privacidad/datos personales si aplica.
9. Cualquier integración o credencial adicional aprobada.

Toda definición recibida debe quedar versionada y trazable antes de activar automatización.

---

## Fase 5 — Documentación y capacitación

Entregables mínimos:

- manual de usuario por rol;
- manual de administración;
- runbook de operación;
- runbook de incidentes y rollback;
- arquitectura y modelo de datos actualizados;
- inventario de fuentes y responsables;
- matriz de permisos;
- procedimiento de generación y distribución de reportes;
- procedimiento de actualización de fuentes de mercado;
- procedimiento de valorización y emisión;
- registro de capacitación;
- plan de soporte y mantenimiento.

Capacitación mínima:

- CEO/administración;
- dirección/subdirección;
- partners/ejecutivos que usarán valorización y mercado.

---

## Fase 6 — Paquete final de entrega y aceptación

Checklist final:

- commit exacto de release identificado;
- producción estable en `ppartnersgroup.app`;
- deployment `READY`;
- rollback validado;
- migraciones y esquema reconciliados;
- backups/recuperación documentados;
- secretos no incluidos en entregables;
- documentación consolidada;
- UAT completado;
- capacitación registrada;
- acta/minuta de aceptación;
- lista de pendientes externos del cliente separada de defectos del producto.

## Definición de DONE contractual

La plataforma se considera cerrada cuando:

1. los tres pilares tienen gate técnico PASS;
2. no existen P0/P1 abiertos;
3. producción está estable y verificable;
4. UAT del cliente está ejecutado;
5. documentación y capacitación están entregadas;
6. las definiciones de negocio recibidas están aplicadas o, si aún no fueron entregadas, quedan registradas como dependencias externas que mantienen sólo las funciones correspondientes en estado fail-closed;
7. existe evidencia de aceptación/entrega.

## Orden de ejecución desde hoy

1. Verificar deployment productivo posterior a PR #111 y runtime.
2. Ejecutar QA transversal final de los tres pilares.
3. Preparar checklist UAT y casos de aceptación.
4. Ejecutar UAT con Pedro Pablo/usuarios autorizados.
5. Cerrar defectos encontrados y repetir gate.
6. Incorporar definiciones KPI/reporting cuando Property Partners las entregue.
7. Ejecutar capacitación.
8. Consolidar paquete de entrega y acta de aceptación.
9. Congelar release y documentar baseline final.
