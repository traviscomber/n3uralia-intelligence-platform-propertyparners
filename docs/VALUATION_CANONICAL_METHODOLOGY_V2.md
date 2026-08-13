# Property Partners Valuation Methodology v2

Canonical sources:
- `Plantilla de Valorización Casas.xlsx`
- `Plantilla de Valorización Departamentos.xlsx`

## Apartment methodology

Commercial value:

`useful_area_m2 * useful_rate_uf_m2`

Portal/TocToc comparable UF/m2:

`price_uf / (useful_area_m2 + (total_area_m2 - useful_area_m2) / 2)`

CBRS comparable UF/m2:

`price_uf / useful_area_m2`

Publication scenarios:
- 0%: `commercial_value / (1 - 0.00)`
- 5%: `commercial_value / (1 - 0.05)`
- 10%: `commercial_value / (1 - 0.10)`

Scenario UF/m2 uses the subject weighted area `useful_area_m2 + terrace_area_m2 / 2`.

## House methodology

Commercial value:

`built_area_m2 * built_rate_uf_m2 + land_area_m2 * land_rate_uf_m2`

Portal and CBRS comparable UF/m2:

`price_uf / (built_area_m2 + land_area_m2 / 4)`

Publication scenarios use the same 0%, 5%, and 10% formulas above. Scenario UF/m2 uses `built_area_m2 + land_area_m2 / 4`.

## Evidence and review rules

- Portal/TocToc represent asking-price evidence.
- CBRS represents registered-sale evidence.
- KML neighborhood assignment is territorial evidence when coordinates are available.
- Duplicate listings must be excluded rather than counted as separate comparables.
- Qualitative observations (condition, remodeling, orientation, view, noise, etc.) are review evidence only in v2 and do not apply automatic economic adjustments.
- Every saved case records methodology version, source reference, calculated canonical UF/m2, selected/excluded state, and publication scenarios.

## Compatibility

Historical `valuation-contract-v1` cases remain unchanged. New cases use `property-partners-valuation-v2`.
