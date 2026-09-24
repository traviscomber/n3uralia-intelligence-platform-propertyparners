# Pedro Directorio Agosto 2026 — Canonical Management Authority

Source: `Ago_Directorio.pptx`
SHA-256: `395e5d942d575bf17939cef99567cfa6ef3f2c6b85bb9d1af43a7b2c20ea2f74`
Reporting period: January–August 2026
Board close: August 2026

## Authority

This presentation is the latest Pedro board-management report supplied for Property Partners / PL Real Estate and is the canonical authority for:

- management-credit closings and UF;
- monthly management goals shown in the board report;
- portfolio, follow-up, conversion and management scoring formulas;
- score evolution January–August 2026;
- traffic-light thresholds and management classifications;
- current August operating inputs at company and office level.

It does **not** replace operational CRM close counts. The board report uses credited-management closings, which can be fractional by office. Keep these separate from `sales` and `sales_uf`.

## Corporate identity

UI brand: Property Partners Vitacura.
Legal/report entity shown by Pedro: **PL Real Estate Spa**.

Store the legal/report name as entity metadata; do not rename the application entity unless explicitly approved.

## Scoring formula

`Calidad Gestión = 0.4 × Calidad Cartera + 0.3 × Calidad Seguimiento + 0.3 × Calidad Conversión`

Each dimension has three equally weighted subscores.

### Calidad Cartera

- Meta cartera: `min(Cartera / Meta, 1) × 100`
- Requerimientos por tipo de propiedad: `min(Ratio Req, 1) × 100`
- Calidad precio:
  - ratio ≤ 1.05 → 100
  - ratio ≤ 1.10 → 50
  - ratio > 1.10 → 0

### Calidad Seguimiento

- Leads clasificados: `Clasificados / Activos × 100`
- Leads gestionados en 90 días: `(1 − Leads_sin_gestión_90d / Activos) × 100`
- Leads A gestionados en 15 días: `(1 − LeadsA_sin_gestión_15d / LeadsA) × 100`

### Calidad Conversión

- Visitas realizadas / meta: `min(Visitas realizadas / Meta, 1) × 100`
- Visitas realizadas / agendadas: `Visitas realizadas / Visitas agendadas × 100`
- TC 6m / leads totales: `min(TC% 6m, 2.86) × 35`

The latest Pedro report visibly publishes **100.1** as the literal maximum produced by the closing-rate formula. Therefore canonical v3 reproduces the published formula exactly rather than hard-capping that component at 100.

## Traffic lights

- Goal compliance: red <90%, yellow 90–<100%, green ≥100%.
- YoY growth: red <0%, yellow 0–<20%, green ≥20%.
- Scores: red <50, yellow 50–<70, green ≥70.

## Classifications

- Estrella: all 3 dimensions ≥70.
- Potencial: 1 dimension ≥70 and the other 2 ≥50.
- Captador: Cartera ≥70.
- Vendedor: Conversión ≥70.
- Perseverante: Seguimiento ≥70.
- Riesgo: 2 dimensions <30.
- Desarrollo: otherwise.

When multiple specialized labels could apply outside the explicit Estrella/Potencial rules, do not invent a precedence not defined in the presentation.

## Management credits vs operational sales

The board report shows fractional closings by office and those fractions sum to the corporate management total. Use:

- `management_credited_sales`
- `management_credited_sales_uf`

for the board-management layer.

Do not overwrite:

- `sales`
- `sales_uf`

which remain operational CRM close facts.

Example: June 2026 in the board report is 7.0 credited closings and 135,600 UF, while the CRM operational layer can contain a different close count/value. These are different semantics, not a reconciliation error.

## Entity hierarchy in this report

- PL Real Estate / Property Partners Vitacura
  - Santa María
  - Nueva Costanera
  - Lo Beltrán

The report contains **no Partner-level pages or Partner-level metrics**. Partner reports remain supported by the application, but Partner values must come from a separate canonical upload/source. Do not allocate office values to partners.

## August 2026 published result

Corporate:
- credited closings: 8.0
- credited UF: 141,650
- closing target: 8.2
- UF target: 130,488
- management score: 67.4
- portfolio: 65.8
- follow-up: 69.8
- conversion: 67.3
- classification: Desarrollo

Santa María:
- credited closings: 3.5
- credited UF: 76,800
- closing target: 2.3
- UF target: 50,945
- management score: 67.4

Nueva Costanera:
- credited closings: 2.0
- credited UF: 26,650
- closing target: 2.8
- UF target: 42,746
- management score: 67.5

Lo Beltrán:
- credited closings: 2.5
- credited UF: 38,200
- closing target: 3.1
- UF target: 36,797
- management score: 67.9
- classification: Potencial

## Implementation rules

1. Preserve the presentation as immutable source evidence through filename + SHA-256.
2. Use formula version 3 for newly canonicalized scoring values from this report.
3. Preserve earlier formula versions for historical replay only.
4. Persist published management-credit monthly evolution separately from operational CRM sales.
5. Persist board goals from this report for the corresponding entity/month.
6. Never manufacture Partner-level values from office totals.
7. Report generators must distinguish source layer and metric semantics explicitly.
