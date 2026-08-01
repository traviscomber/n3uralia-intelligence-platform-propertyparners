# Módulo I — Estado de datos y dependencias de cierre

Fecha de corte: 2026-07-29

## Estado verificable

El modelo contractual existe para fuentes, registros crudos, propiedades canónicas, publicaciones, historial, transacciones, barrios, coincidencias y snapshots de métricas.

Después del puente controlado de datos heredados:

- `market_sources`: 7 registros heredados, marcados con metadata de procedencia pendiente de validación.
- `market_neighborhoods`: 11 barrios trasladados al catálogo contractual.
- `market_metric_snapshots`: 11 snapshots agregados con metodología `legacy-bridge-v1`.
- `market_listings`: 0 registros.
- `market_transactions`: 0 registros.
- `market_properties_canonical`: 0 registros.

Los snapshots heredados permiten continuidad visual y pruebas de interfaz, pero no constituyen aceptación contractual del Módulo I porque no contienen observaciones unitarias verificables de oferta y ventas.

## Fuentes mínimas requeridas

| Fuente | Tipo contractual | Entrega mínima | Estado |
|---|---|---|---|
| Conservador de Bienes Raíces | `cbrs` | Histórico de compraventas, identificador, fecha, dirección, precio, superficie y tipo | Pendiente de archivo/acceso validado |
| Portal Inmobiliario | `portal` | Oferta activa e historial autorizado con URL/ID, precio, superficies, atributos y fecha de observación | Pendiente de mecanismo autorizado |
| KML oficial | `kml` | Polígonos de barrios y microbarrios con versión y fecha | Pendiente de archivo oficial |
| Ventas del cliente | `client` | Ventas recientes y datos internos conciliables | Pendiente de archivo maestro |

## Criterios de aceptación de cada carga

1. Archivo o endpoint identificado y autorizado.
2. Hash o versión de origen registrada.
3. Período de cobertura informado.
4. Conteo recibido, aceptado, rechazado y duplicado.
5. Validación de tipos y campos obligatorios.
6. Normalización de dirección, comuna, tipo de propiedad y unidades.
7. Georreferenciación y asignación de barrio/microbarrio.
8. Deduplicación con evidencia del criterio aplicado.
9. Conservación del registro crudo y vínculo con el registro canónico.
10. Conciliación de totales y aprobación del responsable del cliente.

## Campos mínimos esperados

### Transacciones CBR / cliente

- identificador de origen;
- fecha de compraventa;
- dirección normalizada y original;
- comuna;
- tipo de propiedad;
- precio y moneda/unidad;
- superficie útil y total cuando exista;
- dormitorios, baños, estacionamientos y bodega cuando exista;
- rol o identificador predial cuando esté autorizado;
- latitud/longitud o información suficiente para geocodificar;
- fuente y fecha de extracción.

### Publicaciones

- identificador y URL de origen;
- fecha de primera y última observación;
- estado activo/inactivo;
- precio y moneda/unidad;
- dirección o ubicación publicada;
- tipo de propiedad;
- superficies y atributos;
- identificador del anunciante cuando esté permitido;
- texto o metadatos necesarios para deduplicación;
- fuente y fecha de extracción.

### KML

- nombre de barrio;
- microbarrio cuando corresponda;
- geometría válida;
- sistema de referencia;
- versión y fecha;
- autoridad o responsable del archivo.

## Dependencias del cliente

- confirmar legalidad y autorización de cada fuente;
- entregar archivos o accesos productivos;
- aprobar taxonomía de barrios, tipos y atributos;
- aprobar reglas de deduplicación y comparabilidad;
- validar muestras de resultados;
- designar responsable de conciliación y aceptación.

## Riesgo actual

No deben presentarse los indicadores heredados como inteligencia de mercado productiva ni usarse como fundamento único de valorizaciones. La aplicación debe mostrar claramente la metodología `legacy-bridge-v1` hasta que las fuentes obligatorias hayan sido cargadas, conciliadas y aprobadas.
