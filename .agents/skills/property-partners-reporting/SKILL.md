# Property Partners — Canonical Reporting Skill

## Trigger
Apply to every monthly report, PDF, export, report preview, report design review, or report builder for Property Partners Vitacura.

## Authorities (in order)
1. Client-approved source data and approved September 2026 reference documents.
2. Root DESIGN.md (brand and report visual system).
3. docs/reporting/PROPERTY_PARTNERS_AUDIENCE_REPORT_CANONICAL.md (audience contract).
4. Shared source-controlled visual assets and PDF components.

## Hard rules
- No synthetic names, closings, office rankings, percentages, images posing as official assets, or invented logo/slogans.
- Do not compress 37 September partner rows or seven September adjustments/operations into KPI-only summaries.
- September case: 6 operations / 71,560 UF - July historical suspension 1 / 22,000 UF = 5 net / 49,560 UF; apply negative attribution to Lo Beltran and Maria de los angeles Carcavilla.
- Later months: use actual snapshot; never roll September numbers forward.
- CEO: complete commercial bridge, MoM, office follow-up, visits, lead staleness, operations, source details and limitations.
- Directors: operational metrics, numerator/denominator, three offices only for authorized consolidated administrators; office-specific PDF for each director.
- Partners: every applicable named row and all actual activity columns, including zero values and negative changes.
- For partial coverage label N/D; never replace with 0 or quietly compute a speculative score.
- Page sizes A4, white print surfaces, rectangular grids, real approved logo at original aspect ratio, black/charcoal and restrained warm red per DESIGN.md. No decorative charts.
- Period, origin, methodology, page number, and access scope must be visible. Server-side RBAC applies before data enters renderers.

## Acceptance and evidence
1. Capture audience, scope, month, snapshot identity, source hashes and item counts.
2. Assert required sections and reconcile gross, adjustments and net. Abort on contradictory monetary sums or missing required nominal rows.
3. Render the complete PDF, then render **every** page to PNG; visually inspect clipping, fonts, pagination, footer, contrasts and density.
4. Confirm approved logo bytes, page count, A4, semantics, sources, role separation.
5. Run CI and preview; missing coverage or unavailable visual checks = HOLD, not PASS.
6. Do not merge to main or deliver automatically on just build success.

## Runtime note
Skill text in Git does not execute by itself. Production gates belong in executable validation modules and CI tests; this document defines their required behavior.
