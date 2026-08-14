# Governed Operating Intelligence

## Purpose

Property Partners Intelligence Platform is designed to become an operating intelligence system, not a collection of dashboards and not a generic AI assistant.

The differentiating architecture is a governed loop:

```text
Evidence
  → interpretation
  → decision trace
  → role-specific recommendation
  → human-approved action
  → server-validated execution
  → audit
  → measured result
  → learning from real outcomes
```

The system becomes more valuable when each step preserves provenance, authorization and uncertainty.

---

## The moat

The product moat is not the language model.

It is the combination of:

1. canonical real-estate and management data;
2. explicit data provenance and cutoff;
3. deterministic commercial and valuation methodology;
4. role / office / self authorization scope;
5. Decision Trace;
6. operational tasks and workflow state;
7. human confirmation before consequential action;
8. outcome capture;
9. reusable intelligence across market, valuation and management domains.

A model can be replaced. This operating graph should remain stable.

---

## Intelligence layers

### Layer 1 — Canonical evidence

Authoritative or explicitly classified data only.

Examples:

- approved management metrics;
- documentary canonical metrics;
- operational property records;
- valuation cases;
- task state;
- validated market evidence;
- report snapshots.

Missing data stays missing.

### Layer 2 — Deterministic decision logic

Business logic that can be defined must remain outside the LLM.

Examples:

- valuation calculation;
- workflow state transitions;
- capability checks;
- scope resolution;
- contractual scoring;
- alert thresholds;
- delivery retries;
- task lifecycle constraints.

Every rule should eventually have an origin and version.

### Layer 3 — Decision Trace

Decision Trace explains why the system is highlighting something.

Minimum useful trace:

```text
What happened?
Which evidence supports it?
How current is that evidence?
Which rule or methodology was applied?
How certain is the conclusion?
What can the user do next?
```

### Layer 4 — Role surface

The same evidence is transformed according to the user’s operating responsibility.

CEO sees exceptions and cross-office decisions.

Director sees office/team workload and approvals.

Partner sees personal portfolio, assigned work and immediate next actions.

### Layer 5 — Pedro Pablo

Pedro Pablo is the conversational / reasoning interface over authorized operating context.

It must:

- consume safe server-side context contracts;
- never choose authorization scope;
- never receive unrestricted database credentials;
- explain missing information honestly;
- preserve evidence and cutoff;
- prefer deterministic rules over model speculation;
- produce structured proposed actions;
- remain useful if the AI provider is unavailable.

### Layer 6 — Action Gateway

Future write capability must enter through a single controlled pattern:

```text
AI proposal
   ↓
Structured action draft
   ↓
Human confirmation
   ↓
Capability / scope validation
   ↓
Domain validation
   ↓
Transactional server action
   ↓
Audit event
```

The model never writes directly to Supabase.

### Layer 7 — Outcome memory

The platform should learn only from recorded operational results.

Example:

```text
signal detected
  → task created
  → follow-up performed
  → task closed with result
  → later metric movement observed
```

Only then may the product claim that an action correlated with an outcome.

No free-form AI memory may be promoted to canonical truth.

---

## Pedro Pablo operating contract

### Inputs

Only authorized server-side context packs.

Initial domains:

- management;
- tasks;
- valuations.

Future domains may include:

- property intelligence;
- market evidence;
- report history;
- delivery state;
- client-approved methodology;
- action outcomes.

### Outputs

Pedro Pablo may return:

- explanation;
- summary;
- comparison;
- prioritization;
- evidence list;
- confidence;
- unavailable-data statement;
- safe navigation;
- structured proposed action.

### Forbidden outputs

Pedro Pablo must not:

- invent missing facts;
- convert missing to zero;
- expose hidden entities;
- expose raw database/provider errors;
- fabricate client-approved rules;
- silently mix provisional N3uralia rules with contractual methodology;
- write directly to production data;
- claim an action occurred when it was only proposed;
- claim learning without measured outcome evidence.

---

## Proposed action schema

Future Pedro Pablo actions should use a structured contract similar to:

```ts
{
  id: string
  type: 'create_task' | 'review_valuation' | 'follow_up' | 'open_evidence'
  title: string
  reason: string
  subjectReference?: string
  targetProfileId?: string
  dueDate?: string
  evidence: EvidenceRef[]
  requiresConfirmation: true
  executable: boolean
  blockedReason?: string
}
```

The UI may display the proposal before the execution endpoint exists.

`requiresConfirmation` must default to `true` for consequential actions.

---

## Product anti-goals

Do not evolve the platform into:

- an AI chat tab disconnected from workflow;
- an autonomous agent with unrestricted DB access;
- a black-box scoring system;
- a dashboard with more metrics but fewer decisions;
- a recommendation engine without evidence;
- a memory system that stores model guesses as facts;
- a workflow where automation removes accountability.

---

## Quality bar

A new intelligence feature is only complete when it can answer:

1. Which user decision does it improve?
2. Which authorized data supports it?
3. Which rule or model produced the conclusion?
4. What is the evidence cutoff?
5. What happens when data is missing?
6. What happens when a provider fails?
7. What action follows?
8. Who is allowed to perform that action?
9. Is the action reversible or auditable?
10. How will its real outcome be measured?

If those questions cannot be answered, the feature is not ready to become part of the operating intelligence layer.

---

## North star

The target experience is not:

> “Ask AI anything.”

It is:

> “Show me what matters, why it matters, what evidence supports it, what I can do next, and what happened after we acted.”

That is the operating intelligence standard for Property Partners powered by N3uralia.
