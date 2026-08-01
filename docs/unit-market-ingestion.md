# Ingestión unitaria de publicaciones Portal

## Endpoint

`POST /api/market/import/listings`

Requiere rol ejecutivo autorizado.

## Payload

```json
{
  "mode": "preview",
  "source": "Portal Inmobiliario",
  "source_file": "portal-2026-07-30.json",
  "dataset_kind": "portal_apartments",
  "observed_at": "2026-07-30T12:00:00Z",
  "full_snapshot": true,
  "rows": [
    {
      "source_listing_id": "MLC-123",
      "address": "Av. Vitacura 1234",
      "operation": "venta",
      "status": "active",
      "price_uf": 10500,
      "useful_area_m2": 100
    }
  ]
}
```

`dataset_kind` admite `portal_apartments`, `portal_houses` y `portal_projects`.

## Semántica

- `preview` valida sin escribir datos.
- `import` crea una ejecución, conserva todas las filas raw y materializa observaciones aceptadas.
- Cada corte genera historial en `market_listings`; el estado actual se consulta mediante `market_current_listings`.
- `full_snapshot: true` marca como retiradas las publicaciones activas del mismo origen que no aparecen en el nuevo corte.
- Una retirada no se interpreta como venta.

## Resultado

La respuesta distingue:

- recibidas;
- aceptadas;
- rechazadas;
- nuevas;
- actualizadas;
- sin cambios;
- retiradas.

## Prueba aplicada

Se validaron dos cortes consecutivos con dos publicaciones. El segundo corte actualizó el precio de una publicación y retiró la publicación ausente. Los datos QA fueron eliminados después de la verificación.
