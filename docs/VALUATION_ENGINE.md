# Valuation Engine

## Purpose

The Property Partners valuation engine is deterministic, traceable and reviewable. Canonical valuation truth comes from the original Property Partners valuation templates plus approved market evidence. Advisory models may enrich review, but they do not silently replace the canonical calculation.

Canonical methodology version: `property-partners-valuation-v2`.

Canonical source registry: `data/canonical/valuation-intelligence.json`.

## Canonical source hierarchy

1. `Plantilla de Valorización Casas.xlsx`
2. `Plantilla de Valorización Departamentos.xlsx`
3. Canonical CBRS residential transactions
4. Canonical Portal reference listings
5. Property Partners KML neighborhood geometry
6. Human comparable selection and workflow decisions

Live/partial Portal captures are evidence only unless coverage proves a full market snapshot.

## Deterministic template — Departamento

Commercial value:

`usefulAreaM2 × appliedUsefulUfM2`

Subject effective comparison area:

`usefulAreaM2 + terraceAreaM2 / 2`

Portal/TocToc comparable effective area:

`usefulAreaM2 + (totalAreaM2 - usefulAreaM2) / 2`

Portal/TocToc comparable UF/m²:

`priceUf / effectiveComparableArea`

CBRS comparable UF/m²:

`priceUf / registeredAreaM2`

The CBRS area is treated as the registered source area. Do not relabel it as definitively useful area unless source semantics have been audited.

## Deterministic template — Casa

Commercial value:

`builtAreaM2 × builtUfM2 + landAreaM2 × landUfM2`

Effective comparison area:

`builtAreaM2 + landAreaM2 / 4`

Comparable UF/m²:

`priceUf / effectiveComparisonArea`

Construction and land rates are separate inputs. The engine must not collapse them into a single blended input rate.

## Publication scenarios

The source templates preserve three scenarios:

- 0%
- 5%
- 10%

Formula:

`publicationUf = commercialValueUf / (1 - margin)`

The semantics are a publication price that preserves the commercial value after the assumed negotiation margin. This is not equivalent to simply multiplying the commercial value by `1 + margin`.

The UI may highlight +5% as the normal Property Partners recommendation, but the 0/5/10 evidence ladder remains canonical.

## Comparable policy

- Minimum: **3 selected, calculable comparables**.
- Normal reliable working maximum: **5**.
- More than 5 requires an explicit reason showing that the additional evidence improves quality or confidence.
- Portal/TocToc = asking-price evidence.
- CBRS = registered-sale evidence.
- Explicit duplicate listings count once.
- Do not automatically remove the lowest 20% or percentile outliers.
- The lowest-price band may be surfaced as an opportunity/review signal, not as an automatic exclusion rule.
- Every selected or excluded comparable remains traceable to its source.

## Subjective / qualitative factors

The application captures:

- condition;
- remodeling;
- orientation;
- floor;
- light;
- view;
- noise;
- commercial potential.

The database contains review bounds for these fields. Those bounds are **not an approved automatic economic formula**.

Canonical v2 behavior:

`review_evidence_only_no_automatic_economic_adjustment`

Therefore:
- qualitative observations may explain a human decision;
- they may affect confidence or professional review;
- they do not automatically change commercial value in canonical v2.

## Historical regression fixture

The source apartment template contains the historical case Navidad 1427:

- 227 m² useful;
- 53 m² terrace;
- 70 UF/m² applied;
- commercial value: 15,890 UF;
- effective area: 253.5 m²;
- weighted commercial value: 62.7 UF/m²;
- publication scenarios: 15,890 / 16,726 / 17,656 UF.

This is a mathematical regression fixture, not current market truth.

## Source-quality findings

The original templates are formula authorities, but their populated historical evidence is not blindly canonicalized.

Known issues:

1. The apartment template explicitly states that two Portal rows represent the same apartment, while both feed the original source averages. Canonical processing deduplicates them.
2. A value describing useful area is stored in the historical template RUT field. It must not be interpreted as an identifier.
3. The historical apartment Portal URLs are stale relative to the supplied 2026 reference snapshot.
4. Only part of the historical CBRS comparable set reproduces exactly against the supplied canonical CBRS workbook under the legacy matching rule.
5. The house template contains formulas but no populated historical case.
6. Both source templates date from 2020; their formulas remain authoritative, but their example market evidence is historical.

## Market evidence authority

### CBRS

Raw workbook rows are components, not residential sale events.

Canonical aggregation:

`FOJA + NUMERO + FECHA + TOMO`

with:
- exactly one residential primary asset;
- component UF summed into the event;
- remate and permuta excluded.

Use the persisted canonical transaction layer rather than recomputing another aggregation in UI code.

### Portal reference

The Property Partners files are benchmark/reference snapshots:
- houses: 1,731 valid listings;
- departments: 3,440 valid listings;
- projects: 26 valid listings.

They are not today's live inventory.

### Territory

`Barrios Vitacura.kml` is the geometry authority for the 19 Property Partners neighborhoods.

## Canonical vs advisory intelligence

Canonical price calculation:
- template mathematics;
- explicit subject rates;
- selected comparables;
- source evidence;
- workflow decisions.

Advisory only unless separately approved:
- similarity scores;
- second-opinion findings;
- ML shadow predictions;
- PRC features;
- topography;
- road hierarchy;
- regime routing;
- professional-review suggestions.

These layers may assist review or confidence. They must not silently rewrite the canonical v2 result.

## Workflow and issued reports

Every saved valuation must preserve:
- methodology version;
- subject inputs;
- selected/excluded comparables;
- source identifiers;
- canonical UF/m² calculations;
- assumptions and warnings;
- publication scenarios;
- reviewer decisions;
- workflow state.

Issued reports are immutable snapshots. Later Portal or CBRS updates must not rewrite a previously issued valuation.

## Production gate

A production valuation requires:
1. real subject identity;
2. sufficient source attributes;
3. at least 3 selected calculable comparables;
4. traceable price/area/date evidence;
5. explicit human review;
6. CEO/AAL2 approval before issuance where the workflow requires it.

Run the valuation gate before release:

`pnpm valuation:gate`

A successful deterministic gate validates formulas; live-source reconciliation remains a separate data-quality gate.
