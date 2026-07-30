# Roadmap de desarrollo

## Objetivo

Dejar el módulo de inteligencia de mercado listo para operar y presentar únicamente con información canónica, trazable y verificable ya contenida en el sitio y sus fuentes auditadas.

## Regla principal

No inventar, completar ni inferir datos que no estén respaldados por una fuente canónica o por evidencia operativa almacenada en Supabase.

## Estado actual verificado

- Fuentes canónicas auditadas: Portal Inmobiliario, CBRS Vitacura y KML de barrios.
- Publicaciones Portal con identificador válido: 5.197.
- Publicaciones elegibles para venta: 5.190.
- Publicaciones en cuarentena por señal de arriendo: 7.
- Filas CBRS disponibles: 40.843.
- Barrios definidos en KML: 19.
- Registros actualmente materializados en Supabase: 837.
- Identidades confirmadas: 0.
- Ventas confirmadas: 0.

## Fase 1 — Control canónico por archivo

### Alcance

Controlar por separado los archivos canónicos ya auditados:

- `portal_detalle_deptos_full.xlsx`
- `portal_urls_casas_final.xlsx`
- `portal_detalle_Proyectos.xlsx`
- `BASE_CBR_CON_BARRIO_ASIGNADO VITACURA.xlsx`
- `Barrios Vitacura.kml`

### Resultado esperado

Para cada archivo, mostrar y conservar:

- nombre;
- hash;
- cantidad de filas o geometrías esperadas;
- cantidad materializada;
- cantidad rechazada;
- cantidad en cuarentena;
- cantidad pendiente.

## Fase 2 — Materialización de Portal

### Alcance

Materializar las publicaciones Portal elegibles conservando su trazabilidad de origen.

### Campos mínimos

- archivo fuente;
- fila original;
- identificador Portal;
- tipo de propiedad;
- precio;
- superficies disponibles;
- dirección disponible;
- coordenadas disponibles;
- fecha observada;
- payload original;
- estado de aceptación o cuarentena.

### Restricción

Una publicación no se convierte automáticamente en una propiedad única.

## Fase 3 — Calidad territorial

### Alcance

Aplicar la geometría canónica de barrios a los registros que tengan evidencia espacial suficiente.

### Estados permitidos

- asignación única;
- fuera de polígonos;
- asignación ambigua;
- sin coordenadas.

### Restricción

No asignar barrio cuando la evidencia no sea suficiente.

## Fase 4 — Materialización de CBRS

### Alcance

Materializar las filas CBRS conservando archivo, fila original, clave determinística y datos registrales disponibles.

### Restricción

Una fila CBRS no se convierte automáticamente en una venta residencial confirmada ni en un comparable.

## Fase 5 — Identidad Portal–CBRS

### Alcance

Crear candidatos de coincidencia usando únicamente la evidencia disponible:

- ROL;
- dirección;
- barrio;
- distancia;
- tipología;
- superficie;
- precio;
- ventana temporal;
- contradicciones.

### Restricción

La identidad no se confirma únicamente por score. La confirmación requiere evidencia suficiente y revisión humana.

## Fase 6 — Métricas y valorización

### Condición de inicio

Esta fase comienza sólo cuando existan identidades y ventas confirmadas suficientes.

### Alcance

- velocidad de venta;
- absorción;
- relación oferta y cierre;
- comparables;
- valorizaciones;
- escenarios de publicación.

### Restricción

Mientras no exista evidencia suficiente, estas métricas deben permanecer como `Sin datos operativos`.

## Orden de ejecución

1. Control canónico por archivo.
2. Materialización de Portal.
3. Calidad territorial.
4. Materialización de CBRS.
5. Identidad Portal–CBRS.
6. Métricas y valorización.

## Criterio transversal de cierre

Cada fase debe quedar respaldada por:

- trazabilidad a la fuente original;
- conteos reproducibles;
- rechazos explícitos;
- ausencia de datos inventados;
- CI aprobado;
- despliegue de producción verificado.
