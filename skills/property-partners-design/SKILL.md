---
name: property-partners-design
description: Apply the canonical Property Partners Vitacura product-design system when creating, reviewing, or modifying dashboards, reports, forms, tables, charts, maps, navigation, responsive layouts, operational states, exports, or PDFs. Use for brand consistency, role-specific UX, data-trust presentation, accessibility, visual QA, and design-system governance in the Property Partners repository. Preserve canonical data and existing authorization boundaries.
---

# Property Partners Design

Use this skill for any visual, UX, responsive, accessibility, or design-system task in the Property Partners Vitacura platform.

## Required sources

Read these before making a meaningful design decision:

1. `../../DESIGN.md` for the canonical brand, product, UX, accessibility, and validation rules.
2. `../../docs/design/COMPONENTS.md` when selecting, creating, deprecating, or reviewing components.
3. `../../docs/design/DATA-FORMATTING.md` when displaying currency, UF, area, percentages, dates, periods, precision, quality, or missing values.
4. Inspect the exact route, shared components, tokens, role behavior, and real data states before editing.

Do not infer a teal brand color from historical token names. Current canonical brand accents are defined by the actual token values in `app/globals.css`.

## Workflow

### 1. Establish reality

Identify:

- user role;
- operational decision;
- primary and supporting actions;
- source, period, unit, quality, and freshness requirements;
- loading, empty, partial, stale, restricted, error, and success states;
- current route, shell, tokens, components, mobile behavior, and permissions.

Do not redesign from assumptions or from one screenshot alone when code and product context are available.

### 2. Find the system-level cause

Check in this order:

1. tokens and global styles;
2. shell and navigation;
3. shared component;
4. information architecture;
5. route-specific implementation.

Correct the highest reusable level that does not create regressions.

### 3. Preserve trust

Never:

- invent, correct, estimate, or backfill canonical data;
- convert unavailable values to zero;
- expose raw API, database, provider, stack, or exception messages;
- imply certainty not supported by source status;
- expose data or actions outside the role and tenant scope;
- use UI hiding as a replacement for server authorization.

### 4. Reuse before creating

Prefer canonical components in `components/intelligence/design-system.tsx`, `components/ui/operational-state.tsx`, and `components/feedback/public-error-notice.tsx`.

Create a new shared component only when it appears in at least three views, carries a trust/accessibility/responsive contract, prevents meaningful divergence, or centralizes a non-obvious interaction rule.

### 5. Implement the visual system

Use:

- dark canvas and charcoal surfaces;
- square geometry;
- restrained warm-red structural accents;
- Montserrat for primary UI;
- borders, spacing, alignment, and typography instead of routine shadows;
- one dominant primary action per visual region;
- explicit source, period, unit, methodology, and status when required;
- light paper surfaces only for approved reports and print contexts.

Avoid gradients, glass, glow, decorative gauges, 3D charts, excessive cards, large decorative icons, thin body text, and ambient animation.

### 6. Validate

For meaningful UI changes, verify:

- 390 px mobile;
- 768 px tablet;
- 1280 px desktop;
- wide desktop;
- long labels and large values;
- zero versus unavailable values;
- keyboard navigation;
- focus visibility;
- contrast;
- overflow;
- role restrictions;
- print/PDF when applicable;
- lint, typecheck, build, relevant audits, and deployment status when available.

Do not claim visual QA without visually inspecting the result.

## Audit output

When auditing, provide:

- evidence-based score using the scorecard in `DESIGN.md`;
- P0–P3 findings;
- location and evidence;
- user and business impact;
- system-level cause;
- correction proposal;
- what was verified and what remains unverified.

Separate quick wins, system changes, high-impact flow changes, and decisions requiring client or product confirmation.

## Implementation reporting

After changes, report only what was actually completed:

- exact files and components;
- user impact;
- commits;
- checks performed and current results;
- remaining risks or blockers.

Do not merge without explicit authorization.