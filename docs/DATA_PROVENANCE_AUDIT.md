# Auditoría de procedencia del sitio

Fecha: 2026-07-21  
Regla: la información enviada y auditada es la única fuente autoritativa para vistas ejecutivas, valorización y reportes.

## Clasificación activa

| Módulo | Estado | Fuente publicable |
|---|---|---|
| Panel, CEO, Director, Control | Auditado | CRM 84 Excel, Metas 2026 y presentaciones conciliadas |
| Datos CRM, Metas, Presentaciones, Observatorio | Auditado | JSON derivados con hashes y alertas conservadas |
| Mercado y Propiedades | Auditado | 5 archivos de mercado, 5.197 IDs, 5.190 elegibles, 7 cuarentenas, CBRS y KML |
| Valorizador | Auditado | Reglas de las dos plantillas; sin factores adicionales |
| Reportes automáticos | Auditado | CRM, Metas y estructura de presentaciones |
| Fuentes Casas | Vivo separado | Telemetría operacional; no alimenta vistas auditadas |
| Importar Mercado | Manual separado | Requiere acción humana; no altera JSON auditados |
| Knowledge | Operacional separado | Documentos persistidos por usuarios |

## Elementos retirados o en cuarentena

- Reportes IA heredados y recomendaciones automáticas.
- Insights calculados desde `market_data` no conciliado.
- Narrativa IA de valorización con factores no presentes en Excel.
- Inventario `properties` contaminado por imputaciones históricas.
- Scrapers Portal/DataInmobiliaria anteriores: cero escrituras y respuesta `409 quarantined`.
- Fallback sintético de Portal Inmobiliario.
- Cron de scraping y cron de reportes heredados.

## Contrato para reactivar scrapers

1. Venta de casas y departamentos en Vitacura solamente.
2. Listing ID y URL reproducibles.
3. Ausentes como `null`; nunca imputar coordenadas, superficies, dormitorios, baños o días.
4. Conciliación contra los archivos recibidos antes de publicar.
5. Fuente viva separada con etiqueta y activación manual.
6. Ningún dato vivo puede reemplazar silenciosamente el snapshot auditado.
