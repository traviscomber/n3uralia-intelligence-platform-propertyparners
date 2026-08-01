# Módulo I — Estado de preparación de datos

Fecha de revisión: 2026-07-29

## Estado actual

El modelo contractual del Módulo I existe y contempla fuentes, registros crudos, propiedades canónicas, coincidencias, observaciones, publicaciones, historial, transacciones, barrios y snapshots de métricas.

Antes de esta revisión, las tablas contractuales principales no contenían registros. Se aplicó un puente controlado para reutilizar únicamente datos agregados heredados y dejar visibles las dependencias pendientes.

Resultado posterior al puente:

- `market_sources`: 7 registros heredados.
- `market_neighborhoods`: 11 barrios.
- `market_metric_snapshots`: 11 snapshots agregados.

Todos los registros heredados deben considerarse provisionales. No acreditan por sí mismos cumplimiento contractual ni procedencia suficiente.

## Fuentes obligatorias aún pendientes de validación y carga

1. Histórico de compraventas del Conservador de Bienes Raíces.
2. Oferta activa e histórica de Portal Inmobiliario mediante mecanismo autorizado.
3. KML oficial de barrios y microbarrios.
4. Ventas recientes y bases adicionales entregadas por Property Partners.

Cada fuente debe ingresar con:

- identificación y propietario;
- autorización de uso;
- período cubierto;
- hash o versión del archivo;
- cantidad de filas recibidas, aceptadas y rechazadas;
- fecha de importación;
- reglas de normalización;
- reporte de conciliación.

## Funciones que todavía requieren datos reales

- deduplicación de propiedades y publicaciones;
- historial de precio y estado;
- geocodificación y asignación de microbarrio;
- enlace entre publicación y transacción;
- comparables trazables;
- absorción, velocidad de venta y relación oferta/ventas;
- evolución histórica por tipo de propiedad;
- integración directa con el flujo de valorización.

## Criterio de aceptación

El Módulo I no debe marcarse como aceptado hasta que las cuatro fuentes obligatorias hayan sido cargadas, conciliadas y aprobadas, y hasta que una muestra de propiedades pueda seguirse desde el registro crudo hasta la propiedad canónica, publicación, transacción, barrio, métrica y comparable utilizado en una valorización.
