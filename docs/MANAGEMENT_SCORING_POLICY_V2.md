# Política ejecutable de scoring de gestión v3

## Estado

La autoridad canónica vigente es el reporte de Pedro `Ago_Directorio.pptx` (cierre agosto 2026).

- `canonical_v3`: vigente para nuevas publicaciones.
- `canonical_v2`: preservado para reproducir el período interno anterior.
- `historical_v1`: preservado para reproducción histórica.

Fuente canónica y trazabilidad completa: `docs/canonical/PEDRO_DIRECTORIO_AGOSTO_2026.md`.

## Fórmula principal

`Calidad Gestión = 0.4 × Calidad Cartera + 0.3 × Calidad Seguimiento + 0.3 × Calidad Conversión`

Cada dimensión usa tres subscores con igual peso.

## Cartera

- Meta cartera: `min(Cartera/Meta,1)×100`
- Requerimientos: `min(Ratio Req,1)×100`
- Pricing: ≤1.05→100, ≤1.10→50, >1.10→0

## Seguimiento

- Clasificación: `Clasificados/Activos×100`
- Gestión 90d: `(1−L90d/Activos)×100`
- Gestión A 15d: `(1−LA15d/LeadsA)×100`

## Conversión

- Visitas/meta: `min(Vis/Meta,1)×100`
- Realizadas/agendadas: `VisReal/Agend×100`
- Tasa cierre: `min(TC%6m,2.86)×35`

El reporte publicado muestra 100.1 como máximo literal de la tasa de cierre. V3 reproduce esa fórmula exactamente.

## Semáforos

- Meta: rojo <90, amarillo 90–<100, verde ≥100.
- Crecimiento AA: rojo <0, amarillo 0–<20, verde ≥20.
- Score: rojo <50, amarillo 50–<70, verde ≥70.

## Clasificaciones

- Estrella: 3 dimensiones ≥70.
- Potencial: 1 ≥70 y las otras 2 ≥50.
- Captador: Cartera ≥70.
- Vendedor: Conversión ≥70.
- Perseverante: Seguimiento ≥70.
- Riesgo: 2 dimensiones <30.
- Desarrollo: resto.

No inventar prioridad entre múltiples etiquetas especializadas cuando Estrella/Potencial no resuelvan el caso.

## Separación de ventas

El reporte de Directorio usa créditos de gestión, incluso fraccionarios por oficina. Estos se persisten como:

- `management_credited_sales`
- `management_credited_sales_uf`

`sales` y `sales_uf` continúan representando cierres operacionales CRM y no deben ser sustituidos por los valores de Directorio.

## Partner

La presentación de agosto no contiene páginas ni métricas a nivel Partner. El sistema soporta reportes Partner, pero esa capa debe quedar vacía/no evaluable hasta recibir una fuente canónica específica; nunca repartir automáticamente resultados de oficina.
