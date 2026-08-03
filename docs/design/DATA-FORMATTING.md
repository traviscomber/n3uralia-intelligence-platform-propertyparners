# Property Partners Data Formatting Standard

This document complements `DESIGN.md`. It standardizes how canonical values are displayed without changing, correcting, estimating, or backfilling source data.

## Core rule

Formatting changes presentation only. It must never change the underlying value, status, source, date, precision, or confidence level.

Always distinguish:

- `0`: verified zero;
- `null` or unavailable: no usable value;
- `not_applicable`: the metric does not apply;
- `not_evaluable`: the metric cannot be evaluated;
- `provisional`: value exists but is not final;
- `rejected`: source or value was rejected;
- stale: value exists but its freshness threshold has been exceeded.

Never display unavailable data as `0`, `0%`, `$0`, `UF 0`, or an empty chart point.

## Locale

Use Chilean Spanish conventions where applicable:

- locale: `es-CL`;
- decimal separator: comma;
- thousands separator: point;
- date order: day, month, year;
- timezone: use the product’s explicit business timezone when available; do not infer silently.

## Currency

### Chilean pesos

Preferred forms:

- full: `$ 185.000.000`;
- compact summary: `$ 185 MM` only where the loss of precision is acceptable;
- negative: `−$ 2.500.000`;
- unavailable: `No disponible`;
- provisional: `$ 185.000.000 · Provisional`.

Rules:

- do not show decimal places for CLP unless the source explicitly requires them;
- do not compact values in contracts, exports, audit records, or valuation evidence;
- always identify the currency when a view can contain more than one monetary unit.

### UF

Preferred forms:

- `UF 12.450` for whole UF;
- `UF 12.450,35` when source precision includes decimals;
- `UF/m² 85,4` for unit values.

Do not convert between CLP and UF unless the product has an explicit exchange-rate source, observation date, and methodology. When converted values are shown, expose the UF date or exchange-rate date.

## Areas and dimensions

Preferred forms:

- `140 m²`;
- `1.250 m²`;
- `85,5 m²` when the source contains decimal precision;
- `120 m² útiles` and `150 m² totales` when both concepts exist.

Do not merge useful, built, total, land, terrace, or common-area measurements. Preserve the source label.

## Percentages and ratios

Preferred forms:

- `72%` for whole precision;
- `72,4%` when the source supports one decimal;
- `−3,2%` for decline;
- `7 de 10` when the ratio is operationally clearer than `70%`.

Rules:

- do not add decimals the source does not support;
- do not hide the denominator when a small population could mislead;
- distinguish percentage points from percent change;
- pair color with a sign, label, or direction.

## Dates and periods

Preferred forms:

- interface date: `3 ago 2026`;
- formal report date: `3 de agosto de 2026`;
- month period: `julio 2026`;
- range: `1–31 julio 2026`;
- timestamp when operationally necessary: `3 ago 2026, 00:09`.

Rules:

- use the latest closed reporting period as closed data;
- label the current incomplete month as `preliminar` when applicable;
- show observation date separately from report generation date;
- do not describe data as current without a verified timestamp or freshness status.

## Numbers and precision

- preserve canonical precision in audit, export, valuation, and methodology contexts;
- use compact notation only in executive summaries where exact values remain available nearby or on drill-down;
- use tabular numerals in comparative tables and metric rows;
- align numeric columns consistently;
- show units in column headings when every row shares the same unit;
- avoid repeating units in every cell when the heading already establishes them.

Preferred compact notation:

- thousands: `1,2 mil` only in narrative summaries;
- millions: `1,2 MM`;
- billions: use an explicit term rather than an ambiguous abbreviation.

## Missing and quality states

Preferred labels:

| Internal meaning | Display label |
|---|---|
| unavailable / null | `No disponible` |
| missing source | `Fuente pendiente` |
| not applicable | `No aplica` |
| not evaluable | `No evaluable` |
| provisional | `Provisional` |
| verified | `Verificado` |
| rejected | `Rechazado` |
| stale | `Desactualizado` |
| restricted | `Acceso restringido` |

A dash (`—`) may be used in dense tables only when the column legend or surrounding state clearly defines its meaning. Do not use one dash for multiple different states.

## Rankings and comparisons

Every ranking or comparison must show or make directly available:

- metric;
- period;
- population or scope;
- unit;
- completeness or quality status;
- tie behavior where relevant.

Do not rank records with missing or non-comparable values as if they were verified zeros.

## Charts

- axes must include units;
- tooltips must preserve canonical precision appropriate to the decision;
- missing observations remain gaps, not interpolated lines;
- provisional or stale series require an explicit visual and textual status;
- percentages require a bounded and correctly labelled scale;
- monetary charts identify CLP or UF and observation period.

## Exports and PDF

Exports and formal reports must use full precision unless the report definition explicitly requires summarized values. They must include:

- source;
- observation or cutoff date;
- period;
- unit;
- quality status;
- methodology or formula version where applicable;
- generation date.

## Implementation guidance

Prefer centralized formatting helpers over repeated inline formatting. A helper must accept explicit options for unit, precision, unavailable label, and locale. It must not infer a missing value as zero or perform an undocumented conversion.

Any new formatting convention must be added here before being treated as canonical across multiple modules.