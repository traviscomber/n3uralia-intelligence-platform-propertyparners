# CEO Lean Operating System

## Purpose

This standard defines the executive experience for Pedro Pablo and other CEO-level users. It is inspired by Lean management, continuous improvement, visual control, and Toyota-style operating discipline, but it is an original N3uralia adaptation rather than an official Toyota framework.

The CEO interface exists to reduce decision time. It must show verified business data, reveal abnormal conditions, identify ownership, and provide a direct next action. Formulas, database structure, evidence IDs, implementation details, and methodology remain available for audit but must not dominate the executive surface.

## The 10 principles

### 01. Genchi Genbutsu — show the real condition

Show the current verified business condition before interpretation.

Required UI behavior:
- display the value, period, unit, source status, and last update;
- distinguish current, stale, partial, and unavailable data;
- never replace missing data with zero;
- link to the underlying office, property, task, valuation, or report.

### 02. Visual management — abnormalities must be obvious

The CEO should understand the state in seconds.

Required UI behavior:
- show actual, target, and gap together;
- use restrained semantic states for on-track, attention, and critical;
- prioritize the largest verified deviation;
- do not use decorative charts, gauges, or unexplained colors.

### 03. Jidoka — stop and expose quality problems

Do not continue as if data were valid when a material validation problem exists.

Required UI behavior:
- block unsupported conclusions;
- label partial or incompatible evidence;
- expose the affected decision and what remains usable;
- provide a clear route to resolve the issue.

### 04. Just in Time — show only what is needed now

The primary CEO surface contains the information required for the next decision, not every available field.

Required UI behavior:
- first screen: result, target, gap, major risk, pending decisions, and next actions;
- secondary detail: office, partner, property, and historical breakdowns;
- audit detail: methodology, formulas, evidence IDs, and technical metadata.

### 05. One-piece flow — one clear decision path

Each critical item should move through one uninterrupted path from signal to action.

Required UI behavior:
- data → interpretation → decision → owner → action;
- one dominant action per decision card;
- no duplicated navigation destinations;
- no critical function accessible only by manually typing a URL.

### 06. Standard work — consistent executive patterns

The same business question must use the same visual and interaction pattern throughout the platform.

Required UI behavior:
- standard KPI card: actual, target, gap, period, state;
- standard decision card: issue, impact, owner, deadline, action;
- standard trend chart: actual versus target with exact values nearby;
- standard empty, partial, stale, and failure states.

### 07. Heijunka — level the information load

Avoid overwhelming the CEO with dense operational detail or simultaneous priorities.

Required UI behavior:
- limit the first view to the most material items;
- rank decisions by impact and urgency;
- group related operational detail;
- move low-priority controls into secondary navigation or progressive disclosure.

### 08. Kaizen — make improvement measurable

The system must show whether corrective actions improve the result over time.

Required UI behavior:
- retain historical actual, target, and gap;
- show before/after movement for assigned actions when evidence exists;
- show unresolved recurrence;
- never claim improvement without comparable canonical periods.

### 09. Hansei — make deviations explicit

The interface must support disciplined reflection without hiding underperformance.

Required UI behavior:
- state what missed the target;
- show the verified magnitude of the gap;
- distinguish cause evidence from interpretation;
- record the agreed response, owner, and review date.

### 10. Respect for people — assign clarity, not blame

Executive information should make responsibility clear while preserving fair interpretation of incomplete evidence.

Required UI behavior:
- show role and ownership rather than accusatory language;
- separate performance facts from recommendations;
- avoid rankings when population, methodology, or completeness is not valid;
- provide the responsible person with the context and action needed to respond.

## CEO information hierarchy

Every CEO landing page must follow this order:

1. What happened.
2. Against what target.
3. What is the verified gap.
4. Why it matters now.
5. What decision is required.
6. Who owns the next action.
7. By when.
8. Where to open the operational detail.

## Executive card contract

A critical CEO decision card should expose:

```text
Title
Current verified value
Target or expected state
Gap
Business impact
Recommended decision
Owner
Deadline
Primary action
Data status and period
```

Do not expose formulas in the primary card. Formula version, methodology, evidence references, source files, model metadata, and calculation details belong in a secondary audit drawer, methodology section, or report appendix.

## Navigation contract

For CEO users, the primary navigation language is:

- Inicio ejecutivo
- Resultados comerciales
- Propiedades y cartera
- Mercado
- Decisiones pendientes
- Reportes ejecutivos
- Administración

Every enabled CEO function must have a visible navigation entry or a visible contextual action. Hidden route-only functionality is a defect.

## Acceptance test

A CEO unfamiliar with the implementation should be able to answer the following within 30 seconds:

- Are results on target?
- What is the largest verified gap?
- Which office, process, or portfolio requires attention?
- What decision is waiting for me?
- Who owns the next action?
- Where do I open the supporting detail?

If any answer requires reading a formula, database field, methodology block, or manually entering a route, the interface fails this standard.
