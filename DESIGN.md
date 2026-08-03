# Property Partners Vitacura — Design System and Brand Skill

> Canonical design guide for the Property Partners Vitacura intelligence platform, powered by N3uralia.
>
> This file is both a brandbook and an executable design skill. Read it before creating, redesigning, reviewing, or approving any interface in this repository.

## 1. Skill identity

**Name:** `property-partners-design`

**Use this guide when:**

- creating or modifying dashboard pages, reports, forms, tables, charts, navigation, empty states, error states, exports, PDFs, or responsive layouts;
- reviewing brand consistency, hierarchy, accessibility, density, spacing, typography, color, interaction, or mobile behavior;
- translating screenshots or product requirements into production UI;
- deciding whether a component belongs in the shared design system;
- auditing legacy modules before release.

**Expected input:** a product requirement, screenshot, existing route, component, bug report, or design request.

**Expected output:** production-ready UI that preserves canonical data, follows this brand system, uses existing shared components, supports all operational states, and passes responsive and accessibility review.

## 2. Product design objective

The platform is an enterprise operational system for real-estate intelligence, valuation, and commercial management. The interface must prioritize:

1. verifiable information;
2. clear next actions;
3. role-specific operational context;
4. traceability of source, period, methodology, and status;
5. restrained visual hierarchy;
6. high-density information without visual noise;
7. explicit unavailable, incomplete, stale, restricted, and failed states;
8. desktop and mobile usability.

The product must not look like a generic SaaS template, decorative analytics demo, consumer marketplace, or marketing landing page.

## 3. Brand principles

### 3.1 Visual character

The current visual language is:

- dark, technical, editorial, and operational;
- rectangular and architectural;
- high contrast;
- compact but readable;
- restrained in motion and decoration;
- dominated by black, charcoal, warm red, and neutral light text;
- structured through borders, alignment, typography, and spacing rather than shadows or rounded cards.

### 3.2 Product behavior

Every screen must communicate what is known, what is missing, where the information came from, and what the user can do next.

Never:

- invent values to fill empty charts or cards;
- replace missing canonical information with estimates unless the product explicitly labels and supports an estimate;
- hide incomplete source coverage;
- expose raw database, API, stack, provider, or exception messages;
- use decorative metrics with no operational decision attached;
- create visual emphasis that implies a false level of certainty.

## 4. Brand architecture

### 4.1 Product name

Use **Property Partners Vitacura** for the client-facing platform identity.

Use **Powered by N3uralia** or the existing N3uralia attribution only where product architecture, metadata, delivery documentation, or approved interface placement requires it.

Do not introduce new logos, slogans, sub-brands, or naming variants without explicit approval.

### 4.2 Voice and interface copy

Interface language is Spanish.

Copy must be:

- direct;
- factual;
- concise;
- operational;
- free of marketing exaggeration;
- explicit about unavailable or incomplete data;
- consistent with real-estate and management terminology already used by the organization.

Preferred patterns:

- `Sin datos disponibles`
- `Consulta operativa incompleta`
- `Acceso restringido`
- `Datos desactualizados`
- `No fue posible completar la operación.`
- `Referencia del incidente: …`

Avoid:

- `Oops`
- `Algo salió mal` without context
- technical exception text
- speculative explanations
- anthropomorphic or playful system copy

## 5. Color system

The canonical implementation lives in `app/globals.css`. Use semantic variables rather than adding arbitrary hex values.

### 5.1 Core tokens

| Token | Current value | Purpose |
|---|---:|---|
| `--background` | `#050807` | Global dark canvas |
| `--foreground` | `#edf4f3` | Primary text |
| `--card` | `#0c1111` | Primary surface |
| `--popover` | `#0c1111` | Floating surface |
| `--primary` | `#d7332b` | Brand action and structural accent |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--muted` | `#0f1616` | Secondary dark surface |
| `--muted-foreground` | `#9ca9a7` | Muted copy |
| `--border` | `rgba(215, 51, 43, 0.22)` | Default border |
| `--ring` | `#d7332b` | Focus ring base |
| `--destructive` | `#e74c3c` | Destructive/error state |

### 5.2 N3uralia compatibility tokens

| Token | Current value | Purpose |
|---|---:|---|
| `--n3-black` | `#050807` | Deep canvas |
| `--n3-deep` | `#0c1111` | Card/panel surface |
| `--n3-teal` | `#d7332b` | Legacy token mapped to current brand red |
| `--n3-teal-soft` | `#ff766f` | Accessible small-text accent |
| `--n3-teal-dim` | `rgba(215, 51, 43, 0.2)` | Low-emphasis accent fill |
| `--n3-line` | `rgba(215, 51, 43, 0.2)` | Structural divider |
| `--n3-text-light` | `#edf4f3` | Primary text |
| `--n3-text-muted` | `#b6c1bf` | Secondary text |
| `--n3-light-bg` | `#e7eceb` | Light report background |
| `--n3-light-surface` | `#f4f7f7` | Light report surface |
| `--n3-light-text` | `#0b1111` | Text on light surfaces |
| `--n3-light-muted` | `#5b6867` | Muted text on light surfaces |

The token names containing `teal` are historical compatibility names. Do not infer a teal brand color from those names. Their current canonical values are red.

### 5.3 Semantic status colors

Use color as a secondary signal, never as the only signal.

- success: `#65d3a5`
- informational blue: `#6aa9ff`
- warning/stale: `#f6c453`
- error/destructive/accent text: `#ff766f` or `var(--destructive)` depending on severity

Always pair status color with a label, icon, title, or description.

### 5.4 Color rules

- Brand red is structural: primary actions, important labels, active navigation, selected states, and key dividers.
- Destructive red is semantic: errors, irreversible actions, critical alerts.
- Do not make every button red.
- Do not use low-contrast brand red for small text. Use `--n3-teal-soft` for small labels on dark backgrounds.
- Do not introduce gradients unless explicitly approved for a specific artifact.
- Do not use transparent glass cards, neon glows, or decorative blur.
- Light surfaces are reserved primarily for printable reports and explicitly designed data/report contexts.

## 6. Typography

The current root layout loads:

- **Montserrat**: weights 300, 400, 500;
- **Rajdhani**: weights 300, 400.

### 6.1 Usage

Use Montserrat for primary product UI, headings, body text, labels, forms, tables, and actions.

Use Rajdhani only when an existing approved component already relies on it or when a deliberately technical display treatment is required. Do not mix fonts arbitrarily within the same component.

### 6.2 Hierarchy

Recommended hierarchy aligned with the current shared components:

- page title: `text-4xl sm:text-5xl`, semibold, tracking `-0.03em`;
- section title: `text-2xl`, semibold, tracking `-0.02em`;
- panel title: `text-xl`, semibold;
- metric value: `text-3xl`, semibold;
- body: `text-sm`, line height 1.5–1.7;
- labels/eyebrows: `text-xs`, uppercase, semibold, tracking `0.14em–0.20em`;
- dense metadata: never below a readable equivalent of 10 px and only for short secondary labels.

### 6.3 Typography rules

- Avoid ultra-light body text.
- Never use font weight as the only hierarchy mechanism.
- Long titles must wrap naturally; do not shrink them to fit.
- Maintain readable line lengths, normally `max-w-3xl` for descriptions.
- Use tabular numbers where repeated numeric comparison requires alignment.
- Avoid all-caps paragraphs. Uppercase is limited to short labels and eyebrows.

## 7. Geometry, surfaces, and elevation

The canonical radius is `0px`.

### 7.1 Rules

- Default corners are square.
- Default cards and panels use a one-pixel border.
- Use `gap-px` grids with the border color as a structural separator for dense metric layouts.
- Do not use drop shadows for routine hierarchy.
- Do not use floating cards inside floating cards.
- Prefer one clear parent surface with internal dividers.
- Critical surfaces may use `#160d0c` with a destructive border.

### 7.2 Legacy bridge

`app/globals.css` currently normalizes legacy white cards, gray utilities, rounded corners, and shadows inside `.dashboard-content`.

This bridge is transitional. New work must use semantic Property Partners tokens directly and must not depend on global overrides to become visually correct.

## 8. Spacing and layout

### 8.1 Page frame

Use the shared `IntelligencePage` pattern:

- maximum width: `1500px`;
- centered container;
- vertical rhythm: `space-y-8`;
- bottom breathing room: `pb-16`.

### 8.2 Page header

Use `IntelligenceHeader` where possible.

Required order:

1. eyebrow/context;
2. page title;
3. short operational description;
4. primary and secondary actions;
5. optional summary metadata.

On desktop, metadata can sit to the right. On mobile, all content stacks vertically.

### 8.3 Section spacing

- separate major sections clearly;
- use 16–32 px internal spacing based on density;
- avoid arbitrary one-off gaps;
- align panel edges and baselines across a view;
- keep actions close to the section they affect.

### 8.4 Responsive behavior

Minimum review widths:

- 390 px mobile;
- 768 px tablet;
- 1280 px desktop;
- 1440–1600 px wide desktop.

Rules:

- stack headers, actions, and metadata on small screens;
- allow action groups to wrap;
- never compress a title to preserve a side action;
- tables must use controlled horizontal scrolling or transform into a mobile-safe structure;
- fixed-width sidebars must not reduce content below usable width;
- touch targets should be at least 40–44 px high;
- avoid horizontal page overflow.

## 9. Shared components

Prefer the components in `components/intelligence/design-system.tsx`.

### 9.1 `IntelligencePage`

Use as the root frame for intelligence and operational pages.

### 9.2 `IntelligenceHeader`

Use for page identity, explanation, actions, and metadata.

### 9.3 `SectionHeading`

Use before a coherent section. It already stacks safely on mobile and preserves action width.

### 9.4 `MetricGrid` and `MetricCard`

Use for small groups of comparable metrics.

Do not:

- mix unrelated metrics;
- present values without units or periods when those are required to interpret them;
- display zero when the source is actually unavailable;
- turn every data point into a card.

### 9.5 `IntelligencePanel`

Use for grouped operational content. Use `critical` only for genuinely critical states.

### 9.6 `RankedRow`

Use for ordered lists. Pass `rank` as a one-based value or `index` as a zero-based value. Long labels truncate with a title fallback.

### 9.7 `MethodologyNote`

Use for concise source, calculation, scope, or methodology notes. Do not hide required provenance in tooltips only.

### 9.8 Operational states

Use `OperationalState` and `PublicErrorNotice` for loading, empty, restricted, stale, error, success, and informational states.

Never add a raw `detail`, exception message, SQL message, provider response, stack trace, or API payload to an operational state.

## 10. Information architecture

### 10.1 Core modules

The current contracted platform is organized around:

1. Inteligencia de Mercado;
2. Valorización de Propiedades;
3. Control de Gestión Comercial.

Additional or future functionality must remain visibly separated from the current contractual scope.

### 10.2 Navigation

- navigation labels must use domain language, not technical implementation names;
- current location must be visually clear;
- actions must not be duplicated across header, panel, and footer without purpose;
- role-restricted destinations must not appear as active options for unauthorized users;
- route aliases and singular/plural duplicates should resolve to one canonical route.

### 10.3 Page priority

A page should answer, in order:

1. where am I;
2. what is the current operational state;
3. what requires attention;
4. what action can I take;
5. what evidence, period, and source support the view.

System-health information must not dominate the user’s role-specific next decision.

## 11. Data presentation

### 11.1 Canonical values

- preserve values exactly as supplied by canonical sources;
- do not silently correct source data;
- do not backfill missing values;
- distinguish zero, null, unavailable, not applicable, and not evaluable;
- show units and period context;
- use Chilean locale formatting where appropriate.

### 11.2 Tables

Tables are preferred for comparison, audit, history, and dense operational records.

Required considerations:

- clear column labels;
- visible units;
- predictable alignment;
- numeric columns aligned consistently;
- row actions grouped at the end;
- sticky headers only when they materially improve long tables;
- mobile overflow handled explicitly;
- empty and loading states inside the table region;
- no hidden critical fields behind hover-only behavior.

### 11.3 Charts

Use charts only when they reveal a trend, distribution, relationship, or comparison more efficiently than a table.

Rules:

- provide a textual or tabular interpretation where needed;
- include period, unit, and source;
- use the established chart palette;
- do not use 3D charts;
- do not use gauges for decorative progress;
- avoid excessive legends and color categories;
- preserve readable axes and tooltip contrast;
- never fabricate a line across missing observations.

### 11.4 Rankings

A ranking must state:

- metric;
- period;
- population or scope;
- tie behavior where relevant;
- whether the value is provisional, verified, or incomplete.

## 12. Forms and actions

### 12.1 Forms

- labels remain visible; placeholders do not replace labels;
- group fields by user task, not database structure;
- show required state explicitly;
- validate at the field and form level;
- preserve entered values after recoverable failures;
- disable duplicate submissions;
- show saving state;
- use explicit success confirmation;
- destructive operations require clear consequences and confirmation.

### 12.2 Buttons

Primary button:

- one dominant action per region;
- brand red background;
- white text;
- square corners;
- minimum height 40 px.

Secondary button:

- dark surface;
- structural border;
- light text;
- accent border on hover/focus.

Do not use disabled styling that becomes unreadable. Do not present links as buttons unless they trigger navigation or an explicit action.

## 13. States and feedback

Every data-dependent surface must account for:

- initial loading;
- background refresh when relevant;
- empty data;
- filtered empty result;
- partial data;
- stale data;
- restricted access;
- validation error;
- recoverable request failure;
- successful completion.

Error responses must use normalized public codes and controlled messages. An optional sanitized incident reference may be displayed.

Use `role="alert"` for actionable errors and `role="status"` with polite live updates for loading or progress states.

## 14. Accessibility

Minimum requirements:

- keyboard-operable navigation and actions;
- visible `:focus-visible` state;
- focus ring equivalent to the current 3 px `#ff766f` outline with 2 px offset;
- semantic headings in logical order;
- form labels connected to controls;
- status content announced appropriately;
- no color-only meaning;
- sufficient contrast on dark and light surfaces;
- reduced-motion support;
- useful link and button names;
- tables with appropriate header semantics;
- images and icons with meaningful alternative text or hidden decoration.

Do not remove focus outlines. Do not add motion that is required to understand state.

## 15. Motion

Motion is functional, brief, and optional.

Allowed:

- subtle opacity or border transition;
- progress indication;
- panel or menu disclosure;
- state change feedback.

Avoid:

- parallax;
- continuous ambient animation;
- bouncing or pulsing decorative elements;
- long entrance sequences;
- animation that delays access to data.

Respect `prefers-reduced-motion`.

## 16. Icons and imagery

### 16.1 Icons

- use one consistent icon set already present in the project;
- keep stroke weight and optical size consistent;
- icons support labels; they do not replace unclear labels;
- avoid bright multicolor iconography;
- decorative icons must not compete with data.

### 16.2 Images

The operational platform should use imagery sparingly. Real-estate images must preserve natural appearance and must not be globally enhanced, recolored, sharpened, or restyled without an explicit instruction.

When a reference image is supplied, preserve its composition, lighting, softness, texture, realism, and style; change only the requested elements.

## 17. Reports and print

Printable reports use a light paper surface and dark ink. The application shell remains dark.

Rules:

- preserve a white print canvas;
- remove unnecessary navigation and interaction controls;
- maintain source, period, methodology, generation date, and status;
- avoid dark backgrounds that waste ink;
- ensure tables do not clip;
- define controlled page breaks;
- keep brand attribution restrained;
- verify PDF output, not only browser preview.

## 18. Security and trust boundaries in design

Design must not expose:

- database errors;
- stack traces;
- provider messages;
- secrets or environment names;
- internal prompts or reasoning metadata;
- tenant identifiers not required by the user;
- data outside the current role and tenant scope.

A technically correct permission boundary must also be reflected visually: hidden or disabled controls must align with server-side authorization, but UI hiding never replaces authorization.

## 19. Implementation rules

Before adding a component:

1. search for an existing shared component;
2. use semantic tokens;
3. avoid arbitrary hex values and one-off spacing;
4. implement all operational states;
5. verify mobile behavior;
6. verify keyboard and focus behavior;
7. preserve canonical data behavior;
8. avoid introducing new global CSS overrides;
9. keep server-only data and secrets out of client components;
10. add or extend an audit when a visual or trust-boundary regression is repeatable.

New UI must not rely on the legacy normalization bridge in `app/globals.css`.

## 20. Design review workflow

Apply this workflow for every meaningful UI change.

### Step 1 — Establish reality

Inspect the current route, shared components, global tokens, responsive behavior, data states, permissions, and screenshots. Do not redesign from assumptions.

### Step 2 — Define the operational task

State the user role, decision, required data, primary action, edge states, and success condition.

### Step 3 — Reuse the system

Select existing page frame, header, panel, metric, row, methodology, and operational-state components before creating new primitives.

### Step 4 — Implement

Keep the change coherent across desktop, mobile, loading, empty, error, stale, restricted, and success states.

### Step 5 — Validate

At minimum verify:

- 390 px, 768 px, 1280 px, and wide desktop layouts;
- keyboard navigation;
- focus visibility;
- text contrast;
- overflow;
- real long labels and large numbers;
- no-data and partial-data states;
- role restrictions;
- print/PDF behavior when applicable;
- lint, typecheck, build, and relevant audits.

### Step 6 — Report

Report exact files, components, behavior, validation performed, and remaining visual risk. Never claim visual QA that was not executed.

## 21. Acceptance checklist

A design change is not complete until the applicable items below are true.

### Brand

- [ ] Uses canonical tokens.
- [ ] Uses square geometry.
- [ ] Avoids shadows and decorative gradients.
- [ ] Uses brand red selectively.
- [ ] Uses Spanish operational copy.
- [ ] Does not introduce unapproved brand assets.

### Product

- [ ] Supports a clear role-specific decision.
- [ ] Provides a primary next action where appropriate.
- [ ] Shows source, period, unit, and methodology where required.
- [ ] Distinguishes unavailable, zero, stale, and not applicable.
- [ ] Does not fabricate or silently repair canonical data.

### Responsive

- [ ] Works at 390 px.
- [ ] Works at tablet width.
- [ ] Works at desktop width.
- [ ] No uncontrolled horizontal overflow.
- [ ] Actions wrap or stack safely.
- [ ] Tables have a deliberate mobile strategy.

### Accessibility

- [ ] Logical heading order.
- [ ] Keyboard access.
- [ ] Visible focus.
- [ ] No color-only meaning.
- [ ] Sufficient contrast.
- [ ] Correct status announcement.
- [ ] Reduced motion respected.

### Trust and quality

- [ ] No raw technical errors in UI.
- [ ] No unauthorized data or actions.
- [ ] Loading, empty, partial, stale, restricted, error, and success states considered.
- [ ] Existing audits remain green.
- [ ] No claim of completion without actual validation.

## 22. Canonical implementation references

- `app/globals.css` — color tokens, dark/light contrast contract, legacy compatibility bridge, focus, motion, print behavior.
- `app/layout.tsx` — Montserrat and Rajdhani font loading, dark viewport, root metadata.
- `components/intelligence/design-system.tsx` — page, header, section, metric, panel, ranking, and methodology primitives.
- `components/ui/operational-state.tsx` — operational state presentation.
- `components/feedback/public-error-notice.tsx` — normalized public error presentation.
- `lib/public-error.ts` — public error codes and sanitized references.
- `scripts/audit-dashboard-trust-boundaries.mjs` — dashboard error exposure checks.
- `scripts/audit-exposure-boundaries.mjs` — API and browser exposure checks.

When this guide conflicts with the current implementation, do not silently choose one. Treat the conflict as design-system debt, preserve working behavior, and document the required migration.