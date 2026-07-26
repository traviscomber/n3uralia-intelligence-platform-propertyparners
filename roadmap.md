# N3uralia Intelligence Platform Roadmap

**Current date:** July 26, 2026  
**Roadmap horizon:** September 26, 2026  
**Status:** Production roadmap — mandatory execution order

---

## Production governance rule

This roadmap is the source of truth for project execution now that the platform has entered production.

- Work must follow this roadmap strictly and in sequence.
- No roadmap phase may be skipped without an explicit roadmap update committed to `main`.
- No unplanned feature work may begin unless it is first added to this file with scope, dependencies, acceptance criteria, and delivery order.
- Before modifying code, inspect the current implementation, related files, deployment state, and relevant build logs.
- After every commit, verify the corresponding Vercel deployment.
- Do not continue while `main`, CI, or the production deployment is broken.
- Security, authorization, data durability, rollback safety, and observability are part of each deliverable, not optional follow-up work.
- Any claim that a roadmap item is complete must be verified against the repository and production deployment.

---

## Completed as of July 26, 2026

| Capability | State | Notes |
|---|---|---|
| CEO Copilot widget | Done | Structured response and CEO role gating implemented. |
| Intelligence engine | Done | CRM, Market, Valuation, and Targets evidence available. |
| Feedback persistence | Done | `copilot_feedback` persistence and thumbs UI implemented. |
| Decision memory | Done | `decision_history` writes persisted in Supabase. |
| CRM ingestion foundation | Done | Typed ingestion, manifest, and CRM build pipeline foundations exist. |
| Build health | Done | Zero blocking TypeScript errors and production routes compiling. |

### Required verification checkpoint

Before beginning the CRM upload phase, reconcile the completed CRM refactor with `main` and verify all of the following on the same commit:

- `lib/crm-ingestion.ts` is the single source of truth for shared ingestion helpers.
- `scripts/build-crm-intelligence.mjs` imports shared helpers instead of duplicating them.
- `auditWorkbooks` uses injected filesystem and XLSX dependencies where intended.
- `pnpm crm:build` keeps the existing interface and output contract.
- Typecheck, tests, and Vercel deployment pass.

---

# Delivery plan

## Week 1–2 — Documents / RAG layer

**Dates:** July 28 – August 8  
**Outcome:** the CEO Copilot can reason over company presentations and pitch decks as a first-class evidence domain.

### Scope

- Confirm `lib/presentations-2026.ts` exports the required extractor shape.
- Add `presentations` or `documents` to `buildClientEvidence()` in `lib/n3uralia-intelligence-engine.ts`.
- Normalize presentation evidence into the same evidence contract used by CRM, Market, Valuation, and Targets.
- Add stable source metadata: document ID, title, page or slide, date, extraction timestamp, content hash, and extraction quality.
- Add chunking, duplicate detection, stale-document filtering, and empty-content rejection.
- Define durable document storage. Production must not depend on an ephemeral server filesystem.

### Acceptance criteria

- A copilot response cites a presentation by title and slide/page.
- Existing CRM-only answers remain materially unchanged.
- Invalid or empty documents fail safely without breaking the route.
- Tests cover extraction, normalization, ordering, deduplication, and citation rendering.
- Vercel production deployment is `READY` before Week 2–3 begins.

---

## Week 2–3 — Director and Partner Copilots

**Dates:** August 5 – August 15  
**Outcome:** directors and partners receive role-scoped copilots using the established CEO pattern.

### Scope

- `app/api/director/question/route.ts`
- `app/api/partner/question/route.ts`
- `components/director/director-copilot-widget.tsx`
- `components/partner/partner-copilot-widget.tsx`
- Render widgets only for their authorized roles.
- Centralize server-side authorization and shared response schemas.
- Define evidence policies by role:
  - CEO: company-wide strategic evidence.
  - Director: branch, team, operational, and board evidence.
  - Partner: assigned leads, activity, pipeline, and personal performance evidence.
- Add rate limits, request-size limits, and consistent loading/error/empty states.

### Acceptance criteria

- Unauthorized direct API calls return `403`.
- Role scopes prevent cross-role data leakage.
- The same broad question produces appropriately different evidence by role.
- API contract tests cover CEO, director, and partner routes.
- Production deployment is `READY` before Week 3–4 begins.

---

## Week 3–4 — Copilot memory and session continuity

**Dates:** August 12 – August 22  
**Outcome:** the CEO Copilot supports grounded multi-turn follow-up questions.

### Scope

- Replace the stub in `lib/ceo-strategic-conversation-memory.ts` with Supabase reads and writes.
- Create `copilot_conversation_turns` with user, role, session, question, response, evidence IDs, timestamps, and retention metadata.
- Load the last three relevant turns in `app/api/ceo/question/route.ts`.
- Inject previous turns as bounded context into the reasoning layer.
- Add conversation reset and session-boundary behavior.

### Required additions

- Enforce row-level security and ownership checks.
- Do not store unnecessary raw PII.
- Add retention and deletion rules.
- Prevent prompt injection from prior stored turns by clearly separating memory from system instructions.
- Add token-budget truncation and deterministic ordering.

### Acceptance criteria

- A follow-up question correctly references the preceding conversation.
- A different user or role cannot access another user’s turns.
- Resetting a session removes prior turns from active context.
- Memory failures degrade to stateless operation instead of failing the request.
- Production deployment is `READY` before Week 4–5 begins.

---

## Week 4–5 — Active learning loop

**Dates:** August 19 – August 29  
**Outcome:** feedback influences evidence ranking without allowing unstable or unsafe self-modification.

### Scope

- Add `lib/copilot-feedback-processor.ts` to aggregate `copilot_feedback` by evidence ID and context.
- Add `lib/evidence-weight-registry.ts` backed by an `evidence_weights` table.
- Apply bounded evidence weights in `lib/n3uralia-intelligence-engine.ts`.
- Add `app/api/admin/evidence-weights` for inspection and manual override.

### Required additions

- Use minimum sample sizes before changing weights.
- Bound all weights to a safe range.
- Preserve default weights and full audit history.
- Separate negative answer feedback from evidence-quality feedback where possible.
- Add scheduled recalculation, idempotency, and rollback.
- Protect admin routes with explicit authorization.

### Acceptance criteria

- Feedback changes ranking only after the configured sample threshold.
- A single vote cannot suppress evidence globally.
- Admin overrides are audited and reversible.
- Tests cover aggregation, weight bounds, defaults, and rollback.
- Production deployment is `READY` before Week 5–6 begins.

---

## Week 5–6 — CRM data pipeline and real XLSX sync

**Dates:** August 26 – September 5  
**Outcome:** authorized operations users can refresh CRM evidence without developer intervention.

### Scope

- `app/api/admin/crm/upload/route.ts`
- Upload UI in `app/dashboard/datos-crm`
- Timestamp-aware invalidation in `lib/crm-snapshot.ts`
- Execute the CRM ingestion/build process and publish the resulting snapshot.

### Required production design

- Store original XLSX files in durable object storage, not the Vercel filesystem.
- Validate extension, MIME type, ZIP/XLSX structure, file size, workbook count, schema, and expected columns.
- Generate SHA-256 hashes and preserve immutable source versions.
- Create an ingestion job record with status, actor, timestamps, source hash, manifest diff, logs, and output version.
- Run heavy parsing in a background job or controlled worker rather than relying on a long synchronous request.
- Build to a temporary version, validate it, then atomically promote it as active.
- Keep the prior active snapshot for immediate rollback.
- Prevent concurrent promotions with locking or job-state checks.
- Never execute macros or embedded content.

### Acceptance criteria

- An authorized admin can upload a valid workbook and see job progress and last-sync time.
- Invalid files are rejected before becoming active.
- A failed build leaves the previous production snapshot active.
- New evidence becomes visible only after validation and atomic promotion.
- Upload, build, promotion, and rollback actions are auditable.
- Production deployment is `READY` before Week 6–7 begins.

---

## Week 6–7 — Board report generation and real PDF

**Dates:** September 2 – September 12  
**Outcome:** directors can generate a board-ready PDF from current validated evidence.

### Scope

- Implement `lib/board-report-generator.ts` and `lib/board-report.ts`.
- Add `app/api/reports/board/route.ts`.
- Add a “Generate Report” action to `app/dashboard/reportes/directorio`.
- Build sections from CRM, Market, Valuation, Targets, Documents, decisions, and quality issues.

### Required additions

- Pin each report to an immutable evidence snapshot/version.
- Include generation timestamp, reporting period, source summary, confidence, and data-quality caveats.
- Add authorization, rate limiting, timeout handling, and input validation.
- Store report metadata and optionally the generated PDF in durable storage.
- Use deterministic templates and snapshot tests.
- Ensure fonts and charts render consistently in production.

### Acceptance criteria

- A director can generate and download a valid PDF.
- The report references the exact evidence snapshot used.
- Missing evidence produces visible caveats rather than fabricated content.
- Repeated generation from the same snapshot produces structurally consistent output.
- Production deployment is `READY` before Week 7–8 begins.

---

## Week 7–8 — OpenAI integration and real model reasoning

**Dates:** September 9 – September 19  
**Outcome:** the reasoning layer can use an OpenAI model when configured while retaining the deterministic fallback.

### Scope

- Implement the provider call path in `lib/openai-reasoning-layer.ts`.
- Use an evidence-grounded Spanish executive system prompt.
- Preserve the current deterministic path when the key is absent, the provider fails, or safety checks fail.
- Add confidence based primarily on evidence coverage and quality, with model self-assessment treated as a secondary signal.

### Required additions

- Use environment-configured model names; do not hardcode a deprecated model label.
- Add schema-constrained structured output validation.
- Add request timeouts, retry limits, cost/token budgets, and circuit-breaker behavior.
- Log latency, token usage, model version, fallback reason, and evidence IDs without logging secrets or unnecessary PII.
- Defend against prompt injection by separating system instructions, evidence, memory, and user input.
- Require citations for material factual claims.
- Add evaluation fixtures comparing deterministic and model-backed outputs.

### Acceptance criteria

- “¿Qué debo saber hoy?” produces a richer contextual response when the provider is enabled.
- Every material claim remains traceable to evidence.
- Provider failure automatically returns the deterministic response.
- Invalid model output is rejected or repaired through schema validation.
- Cost, latency, and fallback metrics are observable.
- Production deployment is `READY` before final hardening.

---

## Week 8 — Hardening and controlled merge to main

**Dates:** September 16 – September 26  
**Outcome:** all roadmap capabilities are production-ready on `main` with verified rollback paths.

### Scope

- Merge completed feature branches in roadmap order.
- Run end-to-end smoke tests:
  - CEO login;
  - CEO copilot question;
  - structured response and citations;
  - feedback persistence;
  - multi-turn follow-up;
  - director copilot;
  - partner copilot;
  - CRM upload and promotion;
  - board report PDF;
  - OpenAI path and deterministic fallback.
- Resolve all TypeScript strict-mode warnings introduced during delivery.
- Update `MEMORY.md` or the current architecture document with the final architecture state.

### Required additions

- Verify database migrations, RLS policies, storage policies, indexes, and rollback scripts.
- Add production dashboards and alerts for route errors, provider failures, ingestion failures, job duration, and PDF generation failures.
- Document incident response, rollback, data recovery, and manual fallback procedures.
- Run dependency and secret scans.
- Confirm backup and restoration procedures for Supabase tables and storage.
- Record final performance baselines and known limitations.

### Exit criteria

- All automated tests and production smoke tests pass.
- `main` and production are healthy.
- No critical or high-severity security findings remain open.
- Rollback has been tested for CRM snapshots, database migrations, and application deployments.
- Architecture and operations documentation are current.

---

## Summary

| Week | Focus | Key deliverable |
|---|---|---|
| 1–2 | Documents / RAG | Presentations available as cited evidence |
| 2–3 | Director + Partner copilots | Two role-scoped copilot experiences live |
| 3–4 | Conversation memory | Grounded, stateful CEO follow-ups |
| 4–5 | Active learning | Feedback safely adjusts evidence ranking |
| 5–6 | CRM upload pipeline | Operations can version and promote CRM data |
| 6–7 | Board report PDF | Director generates a report from immutable evidence |
| 7–8 | OpenAI reasoning | Provider-backed reasoning with deterministic fallback |
| 8 | Hardening | Production verification, observability, rollback, and documentation |

---

## Immediate next action

Begin **Week 1–2: Documents / RAG layer**.

Before writing code:

1. inspect `lib/presentations-2026.ts`;
2. inspect `buildClientEvidence()` and the evidence contract;
3. inspect current copilot citation rendering;
4. inspect the latest production deployment and build logs;
5. define acceptance tests for presentation-backed answers.
