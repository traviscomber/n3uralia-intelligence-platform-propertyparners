# AUDIT 02 — Last 20 Commits

Status: IN PROGRESS
Reviewed: 5 of 20
Repository: `traviscomber/n3uralia-intelligence-platform-propertyparners`
Source branch: `main`
Audit branch: `audit/phase-1-reality`

## Review method

Each commit is evaluated against six questions:

1. What does the commit claim?
2. What files and behavior did it actually add or change?
3. Is the implementation connected to an active runtime path?
4. Does it preserve data provenance and semantic accuracy?
5. What regression, duplication or security risk exists?
6. What remains unverified?

No commit is marked complete solely because code exists.

---

## 1. `19e102a22806dead5e55afdcf0864eb8125118a4`

**Claim:** `feat: connect market intelligence to scraper source lineage`

**Files changed:**

- `lib/market-scraper-connector.ts` — new file, 156 lines.

**Observed implementation:**

- Reads `data/market-source-intelligence.json` as a build-time artifact.
- Maps source files to apartments, houses, projects and registered-sales dataset kinds.
- Checks presence of file hash, byte size and expected row count.
- Exposes `getScraperConnectionStatus()`.
- Exposes `ingestScraperRows()` and rejects rows when declared count does not match.
- Explicitly labels connection mode as `build_artifact`.
- Explicitly states that this is not a live network connection.

**Assessment:**

- The commit title can be misread as a live scraper integration, but the implementation itself correctly limits the claim to artifact-level lineage.
- Hash and byte metadata are read from the manifest but are not recalculated against an actual file at runtime. The code verifies metadata presence, not file integrity.
- `ingestScraperRows()` validates row count but does not validate the supplied rows against the declared SHA-256 or byte size.
- No evidence in this commit proves that `ingestScraperRows()` is invoked by an API, scheduled job, database ingestion path or dashboard.

**Findings:**

- **High — semantic integration risk.** `connected: true` means metadata fields exist, not that the scraper process, source files or database are currently reachable.
- **Medium — incomplete integrity validation.** Stored SHA-256 and byte counts are not recomputed.
- **Medium — runtime connection unverified.** The connector may be an isolated library.

**Status:** Requires repository dependency search and runtime validation.

---

## 2. `92f83369e7bec1e48b70c731434f0fb9604ce11f`

**Claim:** `feat: add canonical market intelligence engine foundation`

**Files changed:**

- `lib/market-intelligence-engine.ts` — new file, 318 lines.

**Observed implementation:**

- Defines a canonical property type and source descriptors.
- Normalizes aliases for identity, location, price, area, dates, operation and property type.
- Generates deterministic FNV-style IDs from source and property attributes.
- Calculates a six-check completeness percentage.
- Produces market-readiness capability flags from source inventory.
- Explicitly adds blockers for missing canonical materialization and unvalidated temporal fields.

**Assessment:**

- This is a credible normalization foundation, not a completed canonical market engine.
- The readiness object intentionally distinguishes source availability from quantitative readiness.
- `sourceUpdatedAt` is always `null` in normalized records.
- Date parsing uses the JavaScript runtime parser and does not document accepted source formats or locale ambiguity.
- Numeric parsing assumes one normalization strategy that can misinterpret mixed decimal/thousand separators.
- The deterministic ID can collide when source IDs are missing and property attributes are equal or sparse.
- Source role `published_offer` defaults records to `active` when explicit status is absent. That is an inference, not confirmed source state.
- Capabilities such as `canCalculateAbsorption` are derived from source-type presence, while blockers correctly say rows are not materialized. Consumers could misuse the capability flags without checking blockers.

**Findings:**

- **High — capability semantics.** Capability booleans can appear operational even though canonical rows are not materialized.
- **Medium — inferred status.** Missing status is converted to active for published offers.
- **Medium — parsing ambiguity.** Dates and localized numbers require source-specific validation.
- **Medium — identity collision risk.** Sparse records can generate equal canonical IDs.

**Status:** Foundation validated; production readiness not established.

---

## 3. `75ad2ecf564d4a5c1408e6cbc048f35cae26029c`

**Claim:** `feat: add deterministic temporal decision engine`

**Files changed:**

- `lib/temporal-decision-engine.ts` — new file, 160 lines.

**Observed implementation:**

- Consumes trends from `getExecutiveTemporalSnapshot()`.
- Maps seven CRM metrics to predefined recommendations.
- Produces priority, confidence, evidence keys, expected outcome and guardrails.
- Uses deterministic rules rather than a language model.
- Includes a generic anomaly-validation recommendation.

**Assessment:**

- The engine is deterministic and auditable.
- Recommendations are generic operational playbooks; they are not generated from branch-, agent-, property- or channel-level evidence.
- Confidence becomes high when a streak is at least three or an anomaly exists. That represents rule confidence, not source-data confidence.
- Evidence keys are generated mechanically for both MoM and YoY even when a specific comparison may be unavailable.
- No code in this commit proves recommendations are persisted, presented to users or approved before action.
- Several recommendations advise operational interventions despite not checking attribution completeness, sample size or data freshness directly.

**Findings:**

- **High — confidence semantics.** High confidence may be assigned from pattern shape despite uncertain source quality.
- **Medium — evidence-key overstatement.** Generated evidence references may not exist for every metric/comparison.
- **Medium — recommendation specificity.** Actions are valid guardrailed templates but are not evidence-specific diagnoses.

**Status:** Deterministic rule layer exists; integration and decision quality remain unverified.

---

## 4. `5d8fcac80aabfedbcc1c41020c2a330ff0dc48d7`

**Claim:** `feat: add temporal trend, streak and anomaly analysis`

**Files changed:**

- `lib/temporal-performance.ts` — expanded temporal analysis.

**Observed implementation:**

- Adds momentum, streak, recent range, anomaly and signal classification.
- Uses up to six available monthly records.
- Detects anomalies using the current value against the mean and population standard deviation of prior observations.
- Requires four observations and marks z-score values of at least two as anomalous.
- Generates executive signals and coverage counts.

**Assessment:**

- Logic is deterministic and methodology is embedded in output.
- The series filters null values before analysis, which can make non-consecutive months appear consecutive.
- Filtering uses lexical `month.period <= period`; it assumes strict `YYYY-MM` formatting.
- `slice(-limit)` occurs before null filtering, potentially reducing effective history below the intended window.
- Signal classification treats stock as an inverse metric, assuming lower stock is positive. The same file later warns that stock direction is context-dependent; this is internally inconsistent.
- A population standard deviation on very small history is sensitive and not robust enough for an executive anomaly claim without corroboration.
- A series with zero historic variance flags any change as anomalous, even a small valid change.
- There is no minimum magnitude threshold for streak or signal classification.

**Findings:**

- **High — false sequence risk.** Missing months can be collapsed into a seemingly consecutive trend.
- **High — stock direction assumption.** Lower stock is classified as positive without absorption or demand context.
- **Medium — anomaly robustness.** Small samples and zero-variance handling can over-alert.
- **Medium — missing materiality threshold.** Tiny movements can produce trend classifications.

**Status:** Useful analytical foundation; executive signal semantics require correction and testing.

---

## 5. `f4596eaf08f2e4174164f7127f99c75b95f970cc`

**Claim:** `feat: connect MoM and YoY intelligence to CEO context`

**Files changed:**

- `lib/ceo-intelligence-context.ts` — temporal evidence and signals added.

**Observed implementation:**

- Adds available MoM and YoY comparisons to CEO evidence.
- Labels the source as `CRM del cliente · serie mensual autoritativa`.
- Separates evidence (`client_evidence`) from interpretation (`n3uralia_inference`).
- Adds explicit methodology and compared/current values.
- Adds governance language forbidding monthly/cumulative mixing.

**Assessment:**

- Evidence/inference separation is structurally correct.
- The source is described as authoritative solely through a hardcoded label in this commit. The commit does not prove source ownership, extraction integrity or reconciliation to the operational CRM.
- Signals receive `confidence: high` whenever evidence exists, without evaluating completeness, freshness, missing months or source validation.
- The generated period string uses a slash between comparison and current periods but does not explain ordering to downstream users.
- The commit connects the calculations to the context builder, but not necessarily to the active API or interface. That must be traced later.

**Findings:**

- **High — unsupported authority claim.** `serie mensual autoritativa` requires external or ingestion-level proof.
- **High — confidence overstatement.** Presence of two values is insufficient for high-confidence executive interpretation.
- **Low — period presentation ambiguity.** Period ordering should be explicit.

**Status:** Context integration confirmed at code level; provenance and active runtime path remain unverified.

---

## Cross-commit findings after commits 1–5

### P0 / Critical

None confirmed from static diff review alone.

### P1 / High

1. **Confidence is derived from pattern logic rather than validated source quality.**
2. **Artifact metadata is described as connection state without recomputing integrity.**
3. **Market capability flags can be consumed as readiness despite explicit blockers.**
4. **Temporal trends can collapse missing periods and create false continuity.**
5. **Stock direction is classified with an unjustified universal inverse assumption.**
6. **The CRM series is labeled authoritative without proof in the reviewed commits.**

### P2 / Medium

1. Numeric and date normalization are not source-specific.
2. Canonical IDs can collide for sparse records.
3. Anomaly detection is fragile with small samples.
4. Evidence keys can be generated for unavailable comparisons.
5. Runtime use of new engines remains unverified.

## Required follow-up before closure

- Search all imports and invocations of the new market and temporal modules.
- Inspect the underlying CRM intelligence dataset and its generation script.
- Verify whether monthly periods are complete and consecutive.
- Verify whether manifest SHA-256 values correspond to accessible source artifacts.
- Confirm whether the CEO API and UI consume the updated context builder.
- Add tests to the later remediation plan; do not add them during evidence collection.

## Progress

- [x] Commit 1
- [x] Commit 2
- [x] Commit 3
- [x] Commit 4
- [x] Commit 5
- [ ] Commit 6
- [ ] Commit 7
- [ ] Commit 8
- [ ] Commit 9
- [ ] Commit 10
- [ ] Commit 11
- [ ] Commit 12
- [ ] Commit 13
- [ ] Commit 14
- [ ] Commit 15
- [ ] Commit 16
- [ ] Commit 17
- [ ] Commit 18
- [ ] Commit 19
- [ ] Commit 20
