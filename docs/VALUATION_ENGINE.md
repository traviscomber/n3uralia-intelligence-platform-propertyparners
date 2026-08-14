# Valuation Engine

## Purpose

The valuation engine is deterministic, traceable, and reviewable. It separates the mathematical template used for a subject property from the contractual comparable-based valuation flow. Every production report must preserve the inputs, sources, adjustments, assumptions, and approval state used to produce it.

## Deterministic templates

### Departamento

- Commercial value: `usefulAreaM2 × appliedUsefulUfM2`
- Effective comparison area: `usefulAreaM2 + terraceAreaM2 × 0.5`
- Weighted commercial UF/m²: `commercialValueUf ÷ effectiveAreaM2`
- Publication scenarios: `commercialValueUf ÷ (1 - negotiationMargin)`
- Canonical negotiation margins: `0%`, `5%`, and `10%`

The canonical regression case is Navidad 1427: `227 m²` useful, `53 m²` terrace, and `70 UF/m²`, producing `15,890 UF`, `253.5 m²` effective, and `62.7 UF/m²` weighted.

### Casa

- Construction value: `builtAreaM2 × builtUfM2`
- Land value: `landAreaM2 × landUfM2`
- Effective comparison area: `builtAreaM2 + landAreaM2 × 0.25`
- Commercial value: construction value plus land value

The construction and land rates are intentionally separate. The engine must never collapse them into a single rate.

## Comparable-based valuation

The contractual flow:

1. Uses only comparables explicitly marked `selected`.
2. Requires at least two selected comparables with positive UF/m².
3. Applies each comparable's adjustment percentage.
4. Calculates a weighted median using the canonical similarity scale `0–1`.
5. Applies bounded qualitative adjustments from `-35%` to `+35%`.
6. Returns a suggested range of `±5%` around the adjusted value.

Similarity values expressed as percentages such as `85` are invalid. They must be normalized to `0.85` before entering the engine.

## Evidence requirements

CBRS and Portal evidence must remain traceable to the original source. A valid evidence record should preserve source type, source identifier or URL, normalized address, price, area, transaction or publication date, and coordinates where available. The canonical CBRS regression fixture is Espoz 4233 DP 204, ROL 499-8, sold for `16,800 UF` on `2026-01-06` at `-33.397934, -70.590406`.

Unknown fields must remain unknown. Do not convert missing bedrooms, parking spaces, year, or other facts into a fictitious zero. Presentation layers should display `No informado` when a value is absent.

## Production gate

Run:

```bash
pnpm valuation:gate
```

The gate executes the canonical mathematical tests plus the existing deterministic, intelligence, workflow, and condition verification scripts. A failed check blocks production promotion. The gate is intentionally independent of live external sources so formula regressions can be detected deterministically; live CBRS/Portal reconciliation remains a separate data-ingestion verification step.

## Regression policy

Any change to valuation formulas, similarity normalization, adjustment bounds, publication scenarios, source identity, or snapshot behavior must update the relevant test and document the reason. Issued valuation reports must use immutable snapshots so later Portal changes cannot rewrite historical results.
