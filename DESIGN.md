# Property Partners Vitacura — Design System, Brandbook and Product Design Skill

> Canonical design and UX governance for the Property Partners Vitacura intelligence platform, powered by N3uralia.
>
> Read this file before creating, redesigning, reviewing, approving, or visually validating any interface, report, export, or customer-facing artifact in this repository.

## 1. Status and authority

This document is the repository-level design authority for the current product implementation.

It defines:

- brand expression;
- product-design principles;
- interface architecture;
- visual tokens;
- component usage;
- role-specific UX priorities;
- responsive and accessibility requirements;
- data-trust presentation;
- design review and validation gates.

Source-of-truth order:

1. approved client brand assets and explicit contractual requirements;
2. this document;
3. semantic tokens and shared components in the repository;
4. current production behavior;
5. legacy screen-level styles.

When two sources conflict, do not silently select one. Preserve working behavior, record the conflict as design-system debt, and migrate deliberately.

## 2. Skill identity

**Name:** `property-partners-design`

**Trigger this guide when:**

- creating or modifying dashboards, reports, forms, tables, charts, maps, navigation, filters, states, exports, PDFs, or responsive layouts;
- translating screenshots or requirements into production UI;
- reviewing brand consistency, hierarchy, accessibility, density, spacing, typography, interaction, mobile behavior, or perceived quality;
- deciding whether a component belongs in the shared system;
- auditing legacy modules before release;
- validating whether a visual change improves an actual operational decision.

**Expected input:** a product requirement, screenshot, route, component, bug report, design request, role, workflow, or release candidate.

**Expected output:** production-ready UI that preserves canonical data, follows this system, supports all operational states, uses existing primitives where possible, and passes visual, responsive, accessibility, and trust-boundary review.

## 3. Product thesis

Property Partners Vitacura is an enterprise operational system for real-estate intelligence, property valuation, and commercial management.

The interface must accelerate decisions, not merely display data.

Every meaningful view must help a defined role answer:

1. What is happening?
2. How reliable and current is the information?
3. What requires attention?
4. What action is available now?
5. What evidence supports the decision?

The product must not resemble:

- a generic SaaS template;
- a decorative analytics demo;
- a consumer property marketplace;
- a marketing landing page;
- a collection of unrelated cards;
- a system-health console that obscures business work.

## 4. Design objectives

Prioritize, in this order:

1. verified information and honest uncertainty;
2. role-specific next decisions;
3. operational clarity;
4. source, period, methodology, and status traceability;
5. accessibility and responsive usability;
6. coherent hierarchy and density;
7. brand recognition without visual noise;
8. premium quality through precision, not decoration.

A screen is successful when a user can identify the primary decision and next action in under five seconds.

## 5. Brand character

### 5.1 Visual character

The current visual language is:

- dark;
- technical;
- editorial;
- architectural;
- rectangular;
- high contrast;
- compact but readable;
- restrained in motion and decoration;
- structured through alignment, typography, spacing, and selective borders.

The dominant visual materials are:

- black and deep charcoal canvases;
- warm red structural accents;
- neutral light typography;
- white paper surfaces for print and formal reports.

### 5.2 Premium standard

Premium means:

- exact alignment;
- consistent density;
- strong information hierarchy;
- intentional whitespace;
- restrained color;
- reliable interaction states;
- no visual improvisation;
- no unnecessary decoration.

Premium does not mean:

- gradients;
- glass effects;
- glow;
- excessive cards;
- large decorative icons;
- thin unreadable typography;
- animation without operational purpose.

### 5.3 Non-negotiable product behavior

Every screen must communicate:

- what is known;
- what is missing;
- whether the information is current;
- where it came from;
- what the user can do next.

Never:

- invent values to fill empty charts or cards;
- replace missing canonical information with unapproved estimates;
- convert unavailable values to zero;
- hide incomplete source coverage;
- silently correct source data;
- expose raw database, API, provider, stack, or exception messages;
- create emphasis that implies false certainty;
- show decorative metrics with no decision attached.

## 6. Brand architecture

### 6.1 Product naming

Use **Property Partners Vitacura** for the client-facing platform identity.

Use **Powered by N3uralia** only where product architecture, approved interface placement, metadata, delivery documentation, or contractual attribution requires it.

Do not introduce new:

- logos;
- slogans;
- sub-brands;
- abbreviations;
- naming variants;
- co-branding arrangements.

### 6.2 Logo rules

Use only approved logo files already present in the repository or supplied by the client.

Required behavior:

- preserve original proportions;
- maintain clear space;
- never stretch, crop, recolor, outline, bevel, glow, or place the logo inside an invented container;
- preserve transparency around circular or irregular marks;
- avoid repeated logo placement within a single operational view;
- use restrained N3uralia attribution.

If no approved logo source is available for a requested use, stop and identify the missing asset instead of recreating it.

## 7. Voice and interface copy

Interface language is Spanish.

Copy must be:

- direct;
- factual;
- concise;
- operational;
- specific to the user task;
- explicit about unavailable or incomplete data;
- free of marketing exaggeration;
- consistent with established real-estate and management terminology.

Preferred patterns:

- `Sin datos disponibles`
- `Sin resultados para los filtros seleccionados`
- `Consulta operativa incompleta`
- `Acceso restringido`
- `Datos desactualizados`
- `No fue posible completar la operación.`
- `Referencia del incidente: …`
- `Última observación: …`
- `Fuente: …`

Avoid:

- `Oops`;
- playful system language;
- `Algo salió mal` without task context;
- speculative explanations;
- raw technical text;
- vague actions such as `Continuar`, `Gestionar`, or `Ver más` when a specific label is possible.

Action labels should describe the result:

- `Revisar borradores`
- `Crear valorización`
- `Exportar reporte`
- `Guardar cambios`
- `Reconocer alerta`

## 8. Role-specific UX

The same data must not produce the same interface for every role.

### 8.1 CEO / administración

Primary needs:

- overall operational status;
- exceptions requiring intervention;
- cross-office comparison;
- governance, configuration, and reporting;
- source quality and data freshness;
- delivery and acceptance visibility.

The dashboard should emphasize decisions and exceptions, not system internals.

### 8.2 Dirección / subdirección

Primary needs:

- office performance;
- assigned team and workload;
- unresolved alerts and tasks;
- valuation and pipeline status;
- evidence quality;
- actions requiring approval or follow-up.

### 8.3 Ejecutivo / vendedor

Primary needs:

- personal portfolio;
- assigned properties and tasks;
- valuations in progress;
- next contact or evidence action;
- clear personal performance context;
- restricted access to unrelated offices or users.

### 8.4 Role rules

- primary actions must reflect actual authorization;
- restricted destinations should normally be hidden, not shown disabled;
- disabled controls are acceptable only when explaining a required prerequisite;
- role-specific next actions must appear before system-health summaries;
- UI visibility never replaces server-side authorization.

## 9. Color system

The canonical implementation lives in `app/globals.css`. Use semantic variables instead of arbitrary hex values.

### 9.1 Core tokens

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

### 9.2 N3uralia compatibility tokens

| Token | Current value | Purpose |
|---|---:|---|
| `--n3-black` | `#050807` | Deep canvas |
| `--n3-deep` | `#0c1111` | Card/panel surface |
| `--n3-teal` | `#d7332b` | Historical token mapped to current brand red |
| `--n3-teal-soft` | `#ff766f` | Accessible small-text accent |
| `--n3-teal-dim` | `rgba(215, 51, 43, 0.2)` | Low-emphasis accent fill |
| `--n3-line` | `rgba(215, 51, 43, 0.2)` | Structural divider |
| `--n3-text-light` | `#edf4f3` | Primary text |
| `--n3-text-muted` | `#b6c1bf` | Secondary text |
| `--n3-light-bg` | `#e7eceb` | Light report background |
| `--n3-light-surface` | `#f4f7f7` | Light report surface |
| `--n3-light-text` | `#0b1111` | Text on light surfaces |
| `--n3-light-muted` | `#5b6867` | Muted text on light surfaces |

Token names containing `teal` are historical compatibility names. They do not define a teal brand color. Their current canonical values are red.

### 9.3 Semantic status colors

Use color as a secondary signal, never as the only signal.

| Meaning | Color | Usage |
|---|---:|---|
| Success | `#65d3a5` | Completed, verified, available |
| Information | `#6aa9ff` | Neutral informational state |
| Warning / stale | `#f6c453` | Stale, provisional, attention |
| Error / destructive | `#ff766f` or `var(--destructive)` | Failure, destructive action, critical issue |

Always pair status color with text, iconography, structure, or a status label.

### 9.4 Color rules

- Brand red is structural: primary action, selected navigation, key label, active state, or deliberate divider.
- Destructive red is semantic: error, deletion, irreversible action, or critical alert.
- Never make every action red.
- Use `--n3-teal-soft` for small accent text on dark backgrounds.
- Do not introduce gradients without explicit approval.
- Do not use glass, neon, blur, or glow.
- Light surfaces are reserved for print and explicitly designed report/data contexts.
- Chart colors must preserve semantic meaning across views.

## 10. Typography

The current root layout loads:

- **Montserrat**: weights 300, 400, 500;
- **Rajdhani**: weights 300, 400.

### 10.1 Usage

Use Montserrat for:

- headings;
- body copy;
- labels;
- forms;
- tables;
- navigation;
- actions;
- reports.

Use Rajdhani only when an existing approved component already uses it or when a controlled technical display treatment is required.

Do not mix fonts arbitrarily inside a component.

### 10.2 Scale

| Role | Recommended treatment |
|---|---|
| Page title | `text-4xl sm:text-5xl`, semibold, `tracking-[-0.03em]` |
| Section title | `text-2xl`, semibold, `tracking-[-0.02em]` |
| Panel title | `text-xl`, semibold |
| Metric value | `text-3xl`, semibold, tabular numbers where useful |
| Body | `text-sm`, line height 1.5–1.7 |
| Eyebrow / label | `text-xs`, uppercase, semibold, tracking `0.14em–0.20em` |
| Dense metadata | Minimum readable equivalent of 10 px, only for short secondary information |

### 10.3 Typography rules

- Avoid ultra-light body text.
- Weight alone must not carry hierarchy.
- Long titles wrap naturally; never shrink them to preserve side actions.
- Keep explanatory copy near `max-w-3xl`.
- Use tabular numbers for repeated comparison.
- Uppercase is limited to short labels and eyebrows.
- Numeric abbreviations must not hide precision required for a decision.

## 11. Geometry, surfaces, borders, and elevation

The canonical radius is `0px`.

### 11.1 Surface hierarchy

Use three clear layers:

1. canvas;
2. panel or grouped region;
3. interactive or selected element.

Avoid introducing additional visual layers without a functional reason.

### 11.2 Rules

- Default corners are square.
- Default panels use a one-pixel border.
- Use `gap-px` grids with the border color as a separator for dense metrics.
- Do not use routine drop shadows.
- Avoid card-inside-card composition.
- Prefer one parent region with internal dividers.
- Critical surfaces may use `#160d0c` with a destructive border.
- Do not frame text that does not require grouping or interaction.

### 11.3 Border budget

A view should not rely on a border around every object.

Use borders for:

- region boundaries;
- table structure;
- active or selected states;
- input controls;
- critical emphasis.

Use spacing and alignment before adding another border.

### 11.4 Legacy bridge

`app/globals.css` currently normalizes legacy white cards, gray utilities, rounded corners, and shadows inside `.dashboard-content`.

This bridge is transitional.

New work must:

- use semantic Property Partners tokens directly;
- remain visually correct without the bridge;
- avoid adding new global overrides;
- gradually reduce dependence on legacy utility normalization.

## 12. Layout and spacing

### 12.1 Page frame

Use `IntelligencePage` for intelligence and operational views:

- maximum width: `1500px`;
- centered container;
- `space-y-8` vertical rhythm;
- `pb-16` bottom space.

### 12.2 Page header

Use `IntelligenceHeader` where possible.

Required order:

1. context / eyebrow;
2. page title;
3. operational description;
4. primary and secondary actions;
5. optional summary metadata.

Desktop may place metadata to the right. Mobile must stack content without compressing the title.

### 12.3 Spacing scale

Prefer the existing Tailwind spacing scale.

Recommended usage:

- 8 px: tightly related labels and controls;
- 12–16 px: row and compact panel spacing;
- 20–24 px: standard panel padding;
- 32 px: major section separation;
- 48–64 px: page-level breathing room only.

Avoid one-off spacing values unless required by a verified layout constraint.

### 12.4 Density modes

Use deliberate density:

- **standard** for dashboards, forms, and decision views;
- **compact** for tables, audit logs, rankings, and operational history;
- **spacious** only for onboarding, empty-state education, or executive summary views.

Do not mix density modes randomly within the same screen.

## 13. Responsive behavior

Minimum review widths:

- 390 px mobile;
- 768 px tablet;
- 1280 px desktop;
- 1440–1600 px wide desktop.

Rules:

- stack headers, actions, filters, and metadata on small screens;
- allow action groups to wrap;
- do not preserve desktop columns at the expense of readability;
- tables use controlled horizontal scrolling or an intentional mobile structure;
- sidebars must collapse or transform before reducing content below a usable width;
- touch targets should be 40–44 px minimum;
- no uncontrolled horizontal page overflow;
- long values and labels must be tested with real worst cases;
- fixed and sticky elements must not cover content or mobile controls.

### 13.1 Mobile priority

On mobile, preserve in this order:

1. page identity;
2. status and next action;
3. essential metrics;
4. primary task content;
5. secondary metadata;
6. supporting methodology.

Do not simply scale down the desktop layout.

## 14. Information architecture

### 14.1 Core modules

The current contracted platform is organized around:

1. Inteligencia de Mercado;
2. Valorización de Propiedades;
3. Control de Gestión Comercial.

Future or out-of-scope functionality must remain visibly separated from the contracted scope.

### 14.2 Page priority

Every page should answer, in order:

1. Where am I?
2. What is the operational state?
3. What requires attention?
4. What action can I take?
5. What source, period, methodology, and evidence support the view?

### 14.3 Navigation

- use domain language, not implementation terminology;
- show current location clearly;
- use one navigation pattern per depth;
- avoid duplicated actions in header, card, and footer;
- hide unauthorized destinations unless explanation is operationally necessary;
- resolve route aliases and singular/plural duplicates to one canonical route;
- preserve scroll, focus, and active state on mobile navigation.

### 14.4 Breadcrumbs and tabs

Use breadcrumbs when the user is navigating hierarchy or entity detail.

Use tabs only for peer sections of the same entity or task.

Do not use tabs as a substitute for the main navigation.

## 15. Shared components

Prefer components in `components/intelligence/design-system.tsx`.

### 15.1 `IntelligencePage`

Root frame for operational and intelligence pages.

### 15.2 `IntelligenceHeader`

Page identity, explanation, actions, and optional summary metadata.

### 15.3 `SectionHeading`

Section identity and local action. It already stacks safely on mobile.

### 15.4 `MetricGrid` and `MetricCard`

Use for small groups of comparable metrics.

Do not:

- mix unrelated metrics;
- show values without units or period context;
- display zero when the source is unavailable;
- turn every data point into a card;
- use metrics that do not support a decision.

### 15.5 `IntelligencePanel`

Use for coherent grouped content. Use `critical` only for genuinely critical states.

### 15.6 `RankedRow`

Use for ordered lists. Pass `rank` as one-based or `index` as zero-based. Long labels truncate with a title fallback.

### 15.7 `MethodologyNote`

Use for concise source, calculation, scope, or methodology notes. Required provenance must not exist only in a tooltip.

### 15.8 `OperationalState`

Use for loading, empty, restricted, stale, success, and informational states.

### 15.9 `PublicErrorNotice`

Use for controlled public failures. It may display a sanitized incident reference.

Never pass or render:

- raw `detail`;
- exception messages;
- SQL messages;
- provider responses;
- stack traces;
- internal payloads.

### 15.10 Component creation threshold

Create a new shared component when at least one is true:

- the pattern appears in three or more views;
- the pattern carries a trust, accessibility, or responsive contract;
- divergence would create operational inconsistency;
- the component centralizes a non-obvious interaction rule.

Do not create a shared component merely to shorten one file.

## 16. Data presentation

### 16.1 Canonical values

- preserve canonical values exactly;
- do not silently correct source data;
- do not backfill missing values;
- distinguish zero, null, unavailable, not applicable, not evaluable, provisional, and rejected;
- show units and period context;
- use Chilean locale formatting where appropriate;
- never infer freshness without a real timestamp or source status.

### 16.2 Data confidence model

Where relevant, expose:

- source;
- observation date;
- age or freshness state;
- quality status;
- evaluation status;
- methodology or formula version;
- provisional versus verified state.

Data confidence should be visible but must not dominate the business decision.

### 16.3 Tables

Use tables for comparison, audit, history, and dense operational records.

Required behavior:

- clear column labels;
- visible units;
- consistent numeric alignment;
- row actions grouped at the end;
- deliberate sticky headers only where useful;
- explicit mobile overflow handling;
- loading and empty states inside the table region;
- no critical information hidden behind hover;
- selected and focused rows remain visually distinct;
- pagination or virtualization for genuinely large datasets.

### 16.4 Charts

Use a chart only when it reveals a trend, distribution, relationship, or comparison faster than a table.

Required:

- period;
- unit;
- source;
- readable axes;
- accessible tooltip contrast;
- textual or tabular interpretation where necessary;
- no fabricated lines across missing observations.

Never use:

- 3D charts;
- decorative gauges;
- unexplained color categories;
- animation that delays interpretation;
- charts with more categories than the user can reliably distinguish.

### 16.5 Rankings

A ranking must state:

- metric;
- period;
- population or scope;
- tie behavior when relevant;
- quality status;
- completeness state.

### 16.6 Maps

Maps must communicate a location-based decision, not merely decorate a page.

Required:

- clear geographic scope;
- visible legend when multiple meanings exist;
- fallback when geometry is missing;
- controlled clustering for dense points;
- accessible non-map representation for critical records;
- no invented coordinates or silent geocoding substitutions.

## 17. Forms and actions

### 17.1 Forms

- labels remain visible;
- placeholders do not replace labels;
- group fields by user task, not database structure;
- show required state explicitly;
- validate at field and form level;
- preserve values after recoverable failure;
- disable duplicate submissions;
- expose saving state;
- show explicit success confirmation;
- destructive operations require clear consequence and confirmation;
- long forms need section structure and progress context when appropriate.

### 17.2 Buttons

Primary:

- one dominant action per region;
- brand red background;
- white text;
- square corners;
- minimum height 40 px.

Secondary:

- dark surface;
- structural border;
- light text;
- accent border on hover or focus.

Tertiary:

- text or minimal border treatment;
- use only for low-priority actions.

Destructive:

- use destructive semantics and clear language;
- do not reuse the normal primary style for irreversible actions.

### 17.3 Action hierarchy

Within one region:

1. primary action;
2. secondary action;
3. low-priority or overflow actions.

Do not present multiple equally dominant red buttons.

## 18. States and feedback

Every data-dependent surface must account for:

- initial loading;
- background refresh;
- empty data;
- filtered empty result;
- partial data;
- stale data;
- restricted access;
- validation error;
- recoverable request failure;
- successful completion;
- disabled or unavailable action;
- long-running operation when applicable.

State content should include:

- what happened;
- what remains available;
- what the user can do next;
- incident reference only when useful and sanitized.

Use:

- `role="alert"` for actionable errors;
- `role="status"` with polite live updates for loading or progress;
- `aria-busy` for active regions where appropriate.

## 19. Accessibility

Minimum requirements:

- keyboard-operable navigation and actions;
- visible `:focus-visible` state;
- focus ring equivalent to 3 px `#ff766f` with 2 px offset;
- logical heading order;
- labels connected to form controls;
- announced status changes;
- no color-only meaning;
- sufficient contrast on dark and light surfaces;
- reduced-motion support;
- meaningful link and button names;
- correct table header semantics;
- useful alternative text for informative images;
- decorative icons hidden from assistive technology;
- dialogs with focus management and escape behavior;
- no keyboard traps.

Do not remove focus outlines.

Accessibility validation must include keyboard review, not only automated checks.

## 20. Motion

Motion is functional, brief, and optional.

Allowed:

- subtle opacity or border transition;
- progress indication;
- menu or panel disclosure;
- state-change feedback.

Avoid:

- parallax;
- ambient animation;
- bouncing or pulsing decoration;
- long entrance sequences;
- animation required to understand state;
- animation that delays access to data.

Respect `prefers-reduced-motion`.

## 21. Icons and imagery

### 21.1 Icons

- use one existing icon family;
- maintain consistent stroke, optical size, and alignment;
- icons support labels rather than replace unclear text;
- avoid bright multicolor iconography;
- decorative icons must not compete with data;
- status icons must remain understandable without color.

### 21.2 Operational imagery

Use imagery sparingly.

Real-estate images must preserve natural appearance. Do not globally enhance, recolor, sharpen, relight, or restyle without explicit instruction.

When a reference image is supplied:

- preserve composition;
- preserve lighting;
- preserve softness;
- preserve texture;
- preserve realism;
- preserve style;
- change only requested elements.

### 21.3 Empty-state imagery

Do not add illustrations merely to occupy space. Empty states should first explain the condition and the next valid action.

## 22. Reports, export, and print

Printable reports use a light paper surface and dark ink. The application shell remains dark.

Rules:

- preserve a white print canvas;
- remove unnecessary navigation and controls;
- include source, period, methodology, generation date, and status;
- avoid dark backgrounds that waste ink;
- ensure tables do not clip;
- define controlled page breaks;
- keep brand attribution restrained;
- verify generated PDF output, not only browser preview;
- preserve exact canonical numbers and labels;
- mark provisional, incomplete, or unavailable data explicitly.

## 23. Security and trust boundaries in design

Design must not expose:

- database errors;
- stack traces;
- provider messages;
- secrets or environment names;
- internal prompts or reasoning metadata;
- internal runtime fields;
- tenant identifiers not required by the user;
- data outside the current role or tenant scope.

A technically correct permission boundary must also be reflected visually.

UI hiding never replaces authorization.

## 24. Performance and perceived responsiveness

Design decisions must account for operational performance.

Required:

- avoid loading entire large datasets when the view needs a subset;
- preserve layout during loading;
- prevent duplicate submissions;
- show progress for long operations;
- avoid expensive visual effects;
- keep charts and maps responsive under real data volume;
- use pagination, deferred loading, or virtualization when necessary;
- do not hide slow operations behind indefinite spinners.

A loading state should communicate whether the user can continue elsewhere.

## 25. Implementation rules

Before adding or modifying a UI component:

1. inspect the current route and real data states;
2. identify the role and decision;
3. search for an existing shared component;
4. use semantic tokens;
5. avoid arbitrary hex values and spacing;
6. implement all applicable states;
7. verify mobile behavior;
8. verify keyboard and focus behavior;
9. preserve canonical data behavior;
10. avoid new global CSS overrides;
11. keep server-only data and secrets out of client components;
12. extend an audit when a repeatable regression can be detected automatically.

New UI must not rely on the legacy normalization bridge in `app/globals.css`.

## 26. Design review workflow

### Step 1 — Establish reality

Inspect:

- route;
- shell;
- shared components;
- global tokens;
- role and permission behavior;
- real data states;
- screenshots or deployed product;
- desktop and mobile behavior.

Do not redesign from assumptions.

### Step 2 — Define the operational task

State:

- role;
- decision;
- required data;
- primary action;
- supporting action;
- edge states;
- success condition.

### Step 3 — Identify system-level cause

Before changing a page, determine whether the problem originates in:

- token;
- global style;
- shell;
- navigation;
- shared component;
- information architecture;
- route-specific implementation.

Correct the highest reusable level that does not create regressions.

### Step 4 — Reuse the system

Select existing frame, header, panel, metric, table, ranking, methodology, and operational-state primitives before creating new ones.

### Step 5 — Implement

Keep changes coherent across:

- desktop;
- mobile;
- loading;
- empty;
- filtered empty;
- partial;
- stale;
- restricted;
- error;
- success.

### Step 6 — Validate visually

At minimum inspect:

- 390 px;
- 768 px;
- 1280 px;
- wide desktop;
- long labels;
- large numbers;
- zero and missing values;
- keyboard navigation;
- focus visibility;
- contrast;
- overflow;
- role restrictions;
- print or PDF when applicable.

Do not declare visual completion without visual inspection.

### Step 7 — Validate technically

Run applicable checks:

- lint;
- typecheck;
- build;
- trust-boundary audits;
- route tests;
- deployment status;
- console and runtime errors.

### Step 8 — Report

Report:

- exact files changed;
- system-level reason;
- user impact;
- validation actually performed;
- remaining visual or product risk.

Never claim a check that was not run.

## 27. Design audit scorecard

Use this scorecard for significant reviews.

| Dimension | Weight | Evidence required |
|---|---:|---|
| Brand coherence | 15 | Tokens, typography, geometry, asset use |
| Product clarity | 20 | Role, decision, next action, state clarity |
| UX efficiency | 15 | Friction, task flow, cognitive load |
| Accessibility | 15 | Keyboard, focus, semantics, contrast, motion |
| Responsive quality | 10 | Mobile, tablet, desktop, overflow |
| Data trust | 15 | Source, period, quality, uncertainty, no fabrication |
| Premium consistency | 10 | Alignment, density, restraint, component coherence |

Scores must be evidence-based.

Interpretation:

- 90–100: release-quality system;
- 80–89: strong, minor debt remains;
- 70–79: usable but visibly inconsistent or incomplete;
- 60–69: systemic design debt affects trust or efficiency;
- below 60: redesign or major remediation required.

## 28. Priority classification

Classify findings:

- **P0:** blocks use, security, tenant isolation, accessibility, or data trust;
- **P1:** breaks primary task, role navigation, brand system, or responsive use;
- **P2:** reduces clarity, efficiency, consistency, or perceived quality;
- **P3:** refinement and polish.

Separate recommendations into:

- quick wins;
- system changes;
- high-impact flow changes;
- decisions requiring client or product confirmation.

## 29. Acceptance checklist

A design change is not complete until applicable items are true.

### Brand

- [ ] Uses canonical tokens.
- [ ] Uses square geometry.
- [ ] Avoids routine shadows and decorative gradients.
- [ ] Uses brand red selectively.
- [ ] Uses Spanish operational copy.
- [ ] Does not introduce unapproved assets.
- [ ] Preserves logo proportions and transparency.

### Product

- [ ] Supports a clear role-specific decision.
- [ ] Provides a primary next action where appropriate.
- [ ] Shows source, period, unit, and methodology where required.
- [ ] Distinguishes unavailable, zero, stale, provisional, and not applicable.
- [ ] Does not fabricate or silently repair canonical data.
- [ ] System status does not dominate the operational task.

### Responsive

- [ ] Works at 390 px.
- [ ] Works at tablet width.
- [ ] Works at desktop width.
- [ ] No uncontrolled horizontal overflow.
- [ ] Actions wrap or stack safely.
- [ ] Tables have a deliberate mobile strategy.
- [ ] Sticky or fixed UI does not cover content.

### Accessibility

- [ ] Logical heading order.
- [ ] Keyboard access.
- [ ] Visible focus.
- [ ] No color-only meaning.
- [ ] Sufficient contrast.
- [ ] Correct status announcement.
- [ ] Reduced motion respected.
- [ ] Dialog focus management verified where applicable.

### Trust and quality

- [ ] No raw technical errors in UI.
- [ ] No unauthorized data or actions.
- [ ] Loading, empty, partial, stale, restricted, error, and success states considered.
- [ ] Existing audits remain green.
- [ ] Real long labels and large values were reviewed.
- [ ] No claim of completion without actual validation.

### Reports and print

- [ ] White paper canvas preserved.
- [ ] Source and period visible.
- [ ] Tables and page breaks verified.
- [ ] Generated PDF inspected.
- [ ] Canonical data unchanged.

## 30. Known design-system debt

The following are current risks, not approved permanent patterns:

1. `app/globals.css` contains a broad legacy compatibility bridge that overrides white, gray, rounded, and shadow utilities.
2. Historical token names containing `teal` map to red and can mislead future implementation.
3. Some legacy screens use direct hex values instead of semantic tokens.
4. Red currently performs both brand and some semantic duties; new work must separate structural emphasis from destructive meaning.
5. Responsive and authenticated visual QA is not complete across all roles.
6. Some screens remain more card-heavy than the intended architectural system.
7. Route and component duplication can create inconsistent navigation and actions.

Do not normalize these debts as design rules. Reduce them incrementally.

## 31. Canonical implementation references

- `app/globals.css` — tokens, dark/light contrast contract, compatibility bridge, focus, motion, print.
- `app/layout.tsx` — Montserrat and Rajdhani loading, dark viewport, root metadata.
- `components/intelligence/design-system.tsx` — page, header, section, metric, panel, ranking, methodology primitives.
- `components/ui/operational-state.tsx` — operational-state presentation.
- `components/feedback/public-error-notice.tsx` — normalized public-error presentation.
- `lib/public-error.ts` — public error codes and sanitized references.
- `scripts/audit-dashboard-trust-boundaries.mjs` — dashboard exposure checks.
- `scripts/audit-exposure-boundaries.mjs` — API and browser exposure checks.

## 32. Change governance

Any intentional deviation from this guide must state:

- the business or usability reason;
- affected routes and components;
- whether the change is temporary or canonical;
- migration impact;
- responsive and accessibility consequences;
- validation performed.

Do not change this document merely to legitimize an isolated implementation shortcut.

When this guide conflicts with the current implementation, preserve working behavior, record the discrepancy, and migrate the implementation toward the approved system through small, reviewable changes.