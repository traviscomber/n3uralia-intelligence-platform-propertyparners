# AUDIT 02 — Commits 16–20

Status: COMPLETE
Reviewed: commits 16 through 20 of the mandatory 20
Repository: `traviscomber/n3uralia-intelligence-platform-propertyparners`
Source branch: `main`
Audit branch: `audit/phase-1-reality`

This completes the mandatory review of the latest twenty commits. No commit in the sequence was skipped.

---

## 16. `335cee29c8600a46f8320c7e80b7fd3ec97995b5`

**Claim:** `fix: secure and validate ceo feedback persistence`

**Files changed:**

- `app/api/ceo/feedback/route.ts`.

**Observed implementation:**

- Requires an authenticated user.
- Reads the user's profile role and restricts the route to `ceo`.
- Accepts only `up` or `down` ratings.
- Requires a non-empty question.
- Type-checks answer summary and comment.
- Filters sources to strings.
- Persists feedback into `copilot_feedback` with the authenticated user ID.
- Adds server-side error logging.

**Assessment:**

- Adding server-side role enforcement is a material security improvement.
- The route checks role from the `profiles` table, but this does not prove RLS is correctly configured on `copilot_feedback`.
- Question, summary, comment and sources have no maximum lengths in this commit.
- Sources are filtered by type but not normalized, deduplicated or bounded.
- The database error message is returned directly to the client. This can expose schema, constraint or infrastructure details.
- No response ID, reasoning run ID or immutable answer hash is stored, so feedback cannot be reliably tied to the exact generated response.
- The client still supplies the question and answer summary; a caller can submit fabricated feedback content even while authenticated as CEO.
- No rate limit, duplicate prevention or idempotency key is visible.

**Findings:**

- **High — feedback integrity gap.** The stored question, answer and sources are client-controlled and are not linked to a verified reasoning run.
- **High — RLS remains unverified.** Route authorization does not replace database policy validation.
- **Medium — internal error disclosure.** Raw database errors are returned to the browser.
- **Medium — unbounded input.** Text and source arrays lack explicit limits.
- **Medium — duplicate and abuse controls absent.** No idempotency or rate-limit mechanism is evident.

**Status:** Route-level authentication and role validation improved; persistence integrity and database enforcement remain unverified.

---

## 17. `9a4bc1c61b4dff7b8c9a9ae441c9233e7481b45a`

**Claim:** `feat: route ceo questions by adaptive reasoning depth`

**Files changed:**

- `app/api/ceo/question/route.ts`.

**Observed implementation:**

- Adds regex-based detection of decision intent.
- Classifies importance as high, medium or low using keyword matching.
- Passes the result to `selectReasoningMode()`.
- Sends the selected mode through the reasoning pipeline.
- Changes the API error response to return the caught error message.

**Assessment:**

- Routing is deterministic and inexpensive.
- Keyword classification is language- and wording-sensitive. Important questions without listed keywords can be classified as low importance.
- A low-stakes question containing words such as "inversión" or "despedir" can be escalated regardless of context.
- The classifier does not use user role, affected amount, reversibility, data sensitivity or requested action.
- No audit record of selected mode, classifier inputs or reason is persisted in this commit.
- Exposing `error.message` directly to the client can reveal provider errors, model names, configuration details or upstream payload information.
- Adaptive depth affects cost and latency, but this commit adds no budget ceiling or timeout behavior.

**Findings:**

- **High — unreliable importance classification.** Keyword presence is not a sufficient proxy for executive consequence.
- **Medium — information disclosure.** Internal exception messages are returned to the caller.
- **Medium — cost and latency governance absent.** Deep reasoning can be selected without explicit budget controls.
- **Medium — auditability gap.** The routing decision is not persisted with an explanation.

**Status:** Adaptive routing exists in code; quality, cost governance and observability remain unverified.

---

## 18. `f0416279f1a25f9e3376174175571df08b092672`

**Claim:** `fix: preserve structured executive response through pipeline`

**Files changed:**

- `lib/executive-reasoning-pipeline.ts`.

**Observed implementation:**

- Removes `applyExecutiveResponseGuard()`.
- Returns the structured OpenAI response without flattening it into the old response shape.
- Adds a static `principles` array to every response.
- Accepts an optional reasoning mode.

**Assessment:**

- The commit correctly fixes loss of structured fields through the pipeline.
- Removing the response guard also removes the only explicit deterministic post-processing boundary shown in the prior implementation.
- The appended principles are descriptive metadata; they do not enforce behavior or validate that the response complies.
- There is no deterministic source-reference validation, confidence recalculation, prohibited-content check or evidence-link check in the replacement pipeline.
- The pipeline's context remains typed as `unknown`, so internal contract drift is not prevented at compile time.
- The response is passed through even if model-generated sources do not exist in the supplied context.

**Findings:**

- **High — guardrail regression.** Structured preservation was achieved by removing a deterministic response guard rather than adapting it.
- **High — principles are non-enforcing.** Returning rules alongside output does not prove compliance.
- **Medium — context contract absent.** `unknown` prevents meaningful pipeline type guarantees.
- **Medium — evidence linkage unverified.** No check confirms that returned sources and evidence exist in the input context.

**Status:** Structured response preservation fixed; deterministic post-model validation was weakened.

---

## 19. `ebb3312f7eb9e831d33bff2cf268e3723c7ccab8`

**Claim:** `feat: implement real structured OpenAI executive reasoning`

**Files changed:**

- `lib/openai-reasoning-layer.ts` — major replacement of placeholder behavior.

**Observed implementation:**

- Calls the OpenAI Responses API.
- Uses `store: false`.
- Selects reasoning effort from quick, standard or deep mode.
- Uses a strict JSON schema for summary, signals, evidence, risks, opportunities, confidence and sources.
- Sends the question and full context as JSON.
- Throws when the API key is missing or the provider rejects the request.
- Parses structured output and returns the selected reasoning mode.

**Assessment:**

- This commit replaces a fake placeholder with a genuine provider call. That is a substantial implementation step.
- The default model is hardcoded as `gpt-5.2` unless overridden. Repository code does not prove that this model identifier is available in the deployed account or compatible with the supplied reasoning and schema parameters.
- There is no request timeout, abort signal, retry policy or circuit breaker.
- There is no explicit token/input-size budget before serializing the complete context.
- Provider error messages are propagated upstream.
- `extractOutputText()` uses `any` in this commit.
- The response is JSON-parsed and cast to the expected type; there is no local runtime validator after parsing.
- Strict JSON schema constrains shape, but it does not guarantee factual grounding, correct citations or compliance with the evidence-only instruction.
- Sources are free-form strings rather than references constrained to supplied evidence IDs.
- No model version, prompt version, latency, token usage, request ID or reasoning outcome is persisted for auditability.
- No fallback response exists when OpenAI is unavailable.

**Findings:**

- **High — no deterministic grounding verification.** Schema compliance does not prove factual support from supplied evidence.
- **High — operational resilience absent.** No timeout, retry, circuit breaker or fallback is visible.
- **High — audit trail incomplete.** Model, prompt version, usage and provider request identifiers are not persisted.
- **Medium — model compatibility unverified.** The default identifier and parameter support require deployment validation.
- **Medium — runtime validation gap.** Parsed output is cast rather than independently validated.
- **Medium — unconstrained source references.** Sources are model-generated strings.

**Status:** A real structured OpenAI integration exists at source-code level. Successful production execution and grounded output quality are not established.

---

## 20. `a4681b388874ff644e68294e960c3ff5036448ec`

**Claim:** `feat: persist executive decision outcomes`

**Files changed:**

- `lib/decision-outcome-memory.ts`.

**Observed implementation:**

- Converts `storeDecisionOutcome()` into an authenticated Supabase write.
- Inserts decision, recommendation, expected impact, actual outcome, lessons and learned state into `decision_history`.
- Sets created and updated timestamps in application code.
- Marks a record as learned when both actual outcome and lessons are truthy.
- Returns the inserted database row.

**Assessment:**

- This is real persistence code rather than an in-memory placeholder.
- Authentication is checked, but role authorization is not checked in this function.
- Any authenticated user who can invoke the server function may attempt to write executive decision memory, subject only to unverified RLS.
- Inputs have no runtime validation, trimming, size limits or normalization.
- `learned` is derived from presence of two strings, not from outcome quality, review status or approved lessons.
- Application-provided timestamps duplicate a responsibility that is safer and more consistent as a database default/trigger.
- No organization or tenant identifier is included in the insert shown here.
- No source reasoning run, recommendation ID, evidence snapshot or decision owner is linked.
- No update workflow, versioning or immutable history is shown.
- The function returns the complete inserted row; whether that exposes fields unexpectedly depends on table shape and RLS.

**Findings:**

- **High — authorization incomplete.** Authentication exists, but executive role or permission enforcement is absent in this function.
- **High — tenant isolation unproven.** The write contains no explicit organization scope and relies on unseen schema/RLS behavior.
- **High — memory provenance missing.** Outcomes are not linked to the exact recommendation, evidence or reasoning run that produced them.
- **Medium — weak learned-state semantics.** Two non-empty fields are treated as organizational learning.
- **Medium — input validation absent.** Unbounded and unnormalized text reaches the database.
- **Medium — history/versioning absent.** Decision memory can become mutable or ambiguous without an event model.

**Status:** Database persistence exists in code; authorization, tenant isolation, provenance and lifecycle remain unverified.

---

# Consolidated findings — all 20 commits

## P0 / Critical

No critical issue is confirmed solely from commit diffs. Production runtime, RLS and deployment inspection may elevate some high-risk findings.

## P1 / High

### Data and evidence

1. Source authority is repeatedly declared without end-to-end proof of extraction, reconciliation and ownership.
2. Market artifact metadata is treated as connection/readiness without runtime hash verification or canonical materialization.
3. Current and baseline KPI series are compared without demonstrated definition and population equivalence.
4. Temporal analysis can collapse missing months and create false continuity.
5. Stock direction is interpreted with an unjustified universal rule.
6. Confidence often reflects rule shape or model output rather than source quality.

### AI and reasoning

7. Structured model output lacks deterministic grounding validation against supplied evidence IDs.
8. The response guard was removed to preserve structure and was not replaced with an equivalent validating guard.
9. Model-generated routes and sources are not sufficiently constrained.
10. OpenAI execution lacks verified timeout, retry, circuit breaker and fallback behavior.
11. Model, prompt version, request identifiers, token usage and latency are not demonstrated as persisted audit data.
12. Client-provided conversation history can contain fabricated assistant turns.

### Security and privacy

13. Executive conversation content is stored unencrypted in browser `localStorage`.
14. Feedback content is client-controlled and not linked to a verified reasoning response.
15. Decision-memory writes authenticate users but do not demonstrate executive authorization or tenant isolation.
16. RLS behavior for `copilot_feedback` and `decision_history` remains unverified.

### UX and accessibility

17. The CEO workspace presents itself as a modal without a demonstrated focus trap or background inertness.
18. Model-provided navigation can take precedence over deterministic internal routing.
19. Loading treatment uses multiple simultaneous animations and incomplete reduced-motion behavior.

## P2 / Medium

1. Date, period and localized-number parsing lack source-specific validation.
2. Canonical IDs can collide on sparse records.
3. Small-sample anomaly detection can over-alert.
4. Zero-baseline comparisons lack an explicit semantic state.
5. Several APIs return raw internal/provider/database error messages.
6. Input length, array size and token budgets are inconsistently enforced.
7. Local persisted conversation data is not runtime-validated.
8. Large UI components combine persistence, API, navigation, feedback and rendering responsibilities.
9. Design values and motion settings bypass verified global tokens.
10. Documentation uses terms such as production, complete and connected more strongly than available evidence supports.

# What the twenty commits do establish

The reviewed commits establish a real source-code chain:

`CEO workspace` → `CEO question API` → `CEO intelligence context` → `reasoning router` → `executive reasoning pipeline` → `OpenAI Responses API`.

They also establish source-code writes to:

- `copilot_feedback`;
- `decision_history`.

The commits further establish deterministic foundations for:

- MoM and YoY comparisons;
- temporal trend and anomaly rules;
- canonical market-record normalization;
- market source artifact inventory;
- structured executive recommendations.

# What remains unproven

The twenty-commit review does not prove:

- passing build, typecheck, lint or tests;
- successful production OpenAI calls;
- model availability and parameter compatibility;
- deployed Vercel status;
- correct Supabase migrations and table shapes;
- effective RLS and tenant isolation;
- live scraper connectivity;
- source hash integrity at runtime;
- complete and consecutive monthly data;
- browser accessibility behavior;
- safe model-generated navigation;
- factual grounding quality under representative prompts;
- correct feedback and decision-memory linkage.

# Mandatory next phase

Proceed to repository inventory and dependency mapping before recommending or implementing remediation:

1. repository tree and active application surfaces;
2. routes and API inventory;
3. shared components and design tokens;
4. data files and generation scripts;
5. imports and invocation graph for audited engines;
6. migrations, schema references and RLS definitions;
7. CI, build scripts and deployment configuration;
8. claims in documentation versus active code paths.
