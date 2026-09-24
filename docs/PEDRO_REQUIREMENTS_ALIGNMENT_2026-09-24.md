# Pedro requirements alignment — canonical reset — 2026-09-24

This document is intentionally source-first. Notes from meetings can define product intent, but they do not override canonical source semantics or formulas.

## Canonical authority matrix

| Domain | Canonical source | Authority | Canonical rule in product |
| --- | --- | --- | --- |
| Registered sales | `BASE_CBR_CON_BARRIO_ASIGNADO VITACURA.xlsx` | Property Partners / CBRS reference | 40,843 workbook rows are raw components, not 40,843 residential sales. Canonical residential event = one `FOJA+NUMERO+FECHA+TOMO` inscription with exactly one residential primary asset; sum UF of event components; exclude remate and permuta. Canonical result: 17,581 residential compraventa events = 5,007 Casa + 12,574 Departamento. |
| Portal benchmark · Casa | `portal_urls_casas_final.xlsx` | Property Partners reference snapshot | 1,731 valid Portal listing IDs. Benchmark/reference snapshot, not today's live inventory. |
| Portal benchmark · Departamento | `portal_detalle_deptos_full.xlsx` | Property Partners reference snapshot | 3,442 physical rows, 3,440 valid listing rows after 2 rejected rows. Benchmark/reference snapshot, not today's live inventory. |
| Portal benchmark · Proyecto | `portal_detalle_Proyectos.xlsx` | Property Partners reference snapshot | 26 valid project listings. Some area fields are flagged; do not map contaminated values blindly. |
| Territory | `Barrios Vitacura.kml` | Property Partners | 19 official neighborhoods. KML geometry is the territorial authority. |
| Valuation · Casa | `Plantilla de Valorización Casas.xlsx` | Property Partners | Commercial value uses construction and land component rates; comparison UF/m² uses built area + land/4. |
| Valuation · Departamento | `Plantilla de Valorización Departamentos.xlsx` | Property Partners | Commercial value uses useful m² × applied useful UF/m²; Portal comparison uses useful area + 50% of terrace/excess total area. |
| Management | approved CRM imports + canonical monthly metrics | Property Partners | Metrics are published only for the verified period/formula version. Corporate totals are not reconstructed by blindly summing office subtotals. |

## Important source separation

### 1. Portal reference snapshot vs Portal live

These are different products of the data pipeline and must never be shown as the same universe.

**Reference snapshot**
- Casa: 1,731 valid listings.
- Departamento: 3,440 valid listings.
- Proyectos: 26.
- Source date: 2026-03-09.
- Purpose: benchmark and business intelligence from the Property Partners files.

**Live Portal**
- Comes from the canonical collector.
- A current count is only publishable as a full market count when the ingestion run proves coverage/full snapshot.
- Partial captures remain useful as evidence but must not be extrapolated to total market.

The Pedro-note numbers 46 / 151 / 1,527 are therefore capture/filter observations that need their exact capture context. They are not allowed to replace the canonical reference snapshot or be mixed with current PP inventory.

## CBRS semantics

The workbook includes residential and non-residential components: Casa, Departamento, Estacionamiento, Bodega, Oficina, Comercial, Sitios and others.

Never count raw CBRS rows as house/apartment sales.

Canonical transaction aggregation already exists in the database source metadata:

`one event per FOJA+NUMERO+FECHA+TOMO; exactly one residential primary asset; sum UF of event components; exclude remate and permuta`

This is the correct explanation for Pedro's warning that parking/storage can multiply apparent transaction counts.

For annual market intelligence, use the canonical aggregated Casa/Departamento metrics already persisted from this source. Do not recreate a second aggregation rule in UI code.

## Valuation formulas from the original templates

### Casa

**Comparable weighted area**

`weighted_area = built_m2 + land_m2 / 4`

**Comparable UF/m²**

`price_uf / weighted_area`

The template compares valuation/publication against:
- CBRS max / average / min price;
- CBRS max / average / min weighted UF/m²;
- Portal max / average / min price;
- Portal max / average / min weighted UF/m².

### Departamento

**Commercial value**

`useful_m2 × applied_useful_uf_m2`

**Portal comparison area**

`useful_m2 + (total_m2 - useful_m2) / 2`

The original template retains publication scenarios at 0%, 5% and 10%. Product policy may highlight +5% as Pedro's recommended standard, but must not delete the canonical 0/5/10 evidence ladder.

## Comparable policy

Canonical technical minimum: 3 selected comparables.

Product guidance confirmed by Juan/Pedro:
- 5 is the normal maximum reliable working sample.
- More than 5 is allowed only with explicit justification that the additional evidence improves quality/confidence.
- Do not silently delete observations only because they are outside a percentile.
- The lowest 20% can be surfaced as an **opportunity signal** (“cazar la casa”), not as an automatic outlier-removal rule.

This is an operational policy layered on the canonical valuation methodology; it is not a replacement formula.

## Market intelligence already defined by canonical scope

The product must expose, from the source model above:
- single normalized market base;
- deduplication and canonical identity;
- neighborhood / homogeneous-area assignment;
- property history;
- comparables by neighborhood and homogeneous area;
- market statistics;
- sales velocity;
- absorption;
- offer vs sales;
- historical evolution;
- export/audit trail.

The implementation should improve presentation and coverage of these capabilities, not invent a parallel intelligence methodology.

## Pedro requirements mapped to canonical data

| Pedro need | Canonical implementation rule |
| --- | --- |
| 3–4 year lines and deviations | Read persisted annual CBRS canonical metrics; no second transaction aggregation. |
| MoM / YoY | Use verified monthly management periods with exact comparable month and same formula version. |
| Houses / apartments separated | Use canonical property type after CBRS event aggregation. Parking/storage never enter these two series as primary transactions. |
| Offer / sales / absorption | Offer comes from a proven full live Portal snapshot; sales from canonical CBRS/approved recent-sale source. Do not calculate absorption from a partial capture. |
| Publication duration / DOM | Use listing lifecycle evidence, never infer from snapshot age alone. |
| Map | Leaflet as basemap/interaction layer; Property Partners KML remains the geometry authority. |
| Similar neighborhoods | Must be derived from canonical neighborhood/homogeneous-area evidence and documented criteria; no subjective list hardcoded in UI. |
| Property 360 | Decision-first presentation over canonical property identity, lifecycle, comparables, valuation and evidence. |
| Publication recommendation | Highlight +5% as standard recommendation while preserving 0/5/10 canonical scenario evidence. |
| Opportunity band | Lowest 20% is a review/opportunity signal, not a deletion rule. |
| Weekly reports | Regenerate after the weekly canonical management data upload; report period/source must remain traceable. |
| Finance / P&L | Only after an approved PP financial source is connected. Do not infer from sales UF. |
| Closing lifecycle | Model only from the confirmed PP stages and ownership rules; do not derive from market data. |

## Work accepted in PR #235 after canonical reset

Keep:
- persisting Portal discovery metadata/filter/capture coverage;
- Leaflet rendering over the existing canonical PP neighborhood geometry;
- weekly report snapshot after a verified management upload;
- warning when comparable sample exceeds five;
- a source-authority panel that makes CBRS / Portal reference / KML universes explicit.

Reverted/removed:
- deletion of the canonical +10% publication scenario;
- duplicate “Pedro intelligence” page and parallel metric model;
- calculations that mixed partial live Portal evidence with canonical reference intelligence.

## Release gate

PR #235 remains DRAFT until:
1. CI passes on the canonical-reset head;
2. the source-authority panel is visually QA'd;
3. Leaflet is visually QA'd against the same 19 PP neighborhoods;
4. valuation regression confirms 0/5/10 scenarios and original Casa/Departamento formulas;
5. no UI labels partial/live Portal data as a full market snapshot unless coverage is proven.
