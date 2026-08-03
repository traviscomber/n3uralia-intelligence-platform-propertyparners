# Property Partners Design Component Registry

This registry complements `DESIGN.md`. It records which visual primitives are canonical, transitional, or deprecated so new work does not create duplicate patterns.

## Status labels

- `canonical`: preferred for all new work.
- `transitional`: supported while legacy routes migrate.
- `deprecated`: do not use in new work; replace when touching the route.
- `route-specific`: valid only when the business task is genuinely unique.

## Canonical shared components

| Component | File | Status | Purpose | Required behavior |
|---|---|---|---|---|
| `IntelligencePage` | `components/intelligence/design-system.tsx` | canonical | Root content frame | Centered, max width 1500 px, stable vertical rhythm, mobile-safe padding |
| `IntelligenceHeader` | `components/intelligence/design-system.tsx` | canonical | Page identity and actions | Eyebrow, title, description, actions, optional metadata; stack safely on mobile |
| `SectionHeading` | `components/intelligence/design-system.tsx` | canonical | Section hierarchy | Keep local action attached to section; never compress title to preserve action width |
| `ActionLink` | `components/intelligence/design-system.tsx` | canonical | Navigation styled as a product action | Use only for navigation; support primary, secondary, tertiary, and destructive visual variants |
| `ActionButton` | `components/intelligence/design-system.tsx` | canonical | Product action button | Default `type="button"`; minimum 40 px height; preserve disabled and focus-visible behavior |
| `FormField` | `components/intelligence/design-system.tsx` | canonical | Label, hint, and validation structure | Visible label, optional required marker, hint, and announced error; child control keeps the same `id` |
| `MetricGrid` | `components/intelligence/design-system.tsx` | canonical | Comparable metric groups | Use only for related metrics; support 2, 3, or 4 columns; collapse responsively |
| `MetricCard` | `components/intelligence/design-system.tsx` | canonical | Metric summary | Show label, value, unit/period context where needed; never convert missing data to zero |
| `IntelligencePanel` | `components/intelligence/design-system.tsx` | canonical | Grouped operational content | One parent surface, limited borders, no nested-card composition |
| `StatusBadge` | `components/intelligence/design-system.tsx` | canonical | Compact state label | Pair tone with explicit text; never use color as the only status signal |
| `FilterBar` | `components/intelligence/design-system.tsx` | canonical | Responsive filter region | Stack on small screens, keep actions attached, avoid uncontrolled overflow |
| `DataTable` family | `components/intelligence/design-system.tsx` | canonical | Dense operational records | Semantic headers, numeric alignment, deliberate horizontal overflow region, keyboard-focusable container |
| `RankedRow` | `components/intelligence/design-system.tsx` | canonical | Ordered comparison | Accept one-based `rank` or zero-based `index`; truncate long labels safely |
| `MethodologyNote` | `components/intelligence/design-system.tsx` | canonical | Source and methodology note | Keep provenance visible; do not hide required evidence in tooltips only |
| `OperationalState` | `components/ui/operational-state.tsx` | canonical | Loading, empty, stale, restricted, success, information | No raw technical detail; announce state appropriately; preserve optional sanitized reference only |
| `PublicErrorNotice` | `components/feedback/public-error-notice.tsx` | canonical | Controlled public failure | Use normalized error codes and safe copy; no database, provider, stack, or exception text |

## Component contracts

### Buttons and links

Use one dominant primary action per region. Primary actions use the brand red background, white text, square corners, and a minimum height of 40 px. Secondary actions use a dark surface, structural border, and light text. Destructive actions must use explicit destructive language and must not reuse the normal primary treatment without semantic distinction.

Use `ActionLink` only when the interaction navigates to another route or resource. Use `ActionButton` for mutations, dialogs, submissions, toggles, and local interface actions. Do not style a button as a link merely to avoid choosing the correct semantic element.

Interactive states required for every actionable component:

- default;
- hover;
- active;
- focus-visible;
- disabled;
- loading when asynchronous;
- selected when applicable;
- destructive when applicable.

### Inputs

All inputs require a visible label, accessible name, error association, disabled/read-only treatment, and focus-visible state. Placeholder text never replaces the label. Form actions must prevent duplicate submission and preserve entered values after recoverable failures.

Use `FormField` for the label, hint, and error structure. The child control must use the same `id` passed to `FormField`. When hint or error text is present, the control remains responsible for setting the appropriate `aria-describedby` and `aria-invalid` attributes.

### Tables

Tables require:

- semantic column headers;
- clear unit and period context;
- consistent numeric alignment;
- a deliberate mobile strategy;
- loading, empty, filtered-empty, and error states inside the table region;
- row actions grouped at the end;
- no critical information available only on hover.

Use the `DataTable` family for new operational tables unless a route has a verified requirement that the shared primitive cannot support.

### Dialogs and overlays

Use a modal only when the user must complete or confirm a focused task before continuing. Use a drawer when contextual work benefits from preserving the underlying page. Use popovers and tooltips for supplementary information, never for required instructions or evidence.

All dialogs require:

- focus moved into the dialog;
- focus trapped while open;
- escape handling unless the operation cannot safely be dismissed;
- focus returned to the trigger;
- background scroll control;
- clear title and close action.

## Visual measurements

- Standard control height: 40 px minimum.
- Preferred primary touch target: 44 px.
- Icon sizes: 16 px for dense rows, 18–20 px for standard controls, 24 px only for major standalone actions or state illustrations.
- Standard panel padding: 20–24 px.
- Compact row padding: 12–16 px vertical rhythm.
- Major section separation: 32 px.
- Maximum visual surface depth: canvas → panel → interactive/selected element.
- Maximum dominant primary actions in one visual region: one.

## Transitional patterns

The broad normalization rules in `app/globals.css` that convert white/gray legacy utilities into the dark Property Partners system are `transitional`.

When modifying a route that depends on this bridge:

1. replace direct white, gray, rounded, shadow, and arbitrary-color utilities with semantic tokens;
2. confirm the route remains visually correct without relying on the bridge;
3. avoid extending the global override list;
4. preserve print/report light surfaces explicitly.

## Deprecated patterns

Do not add new instances of:

- card inside card without a functional grouping reason;
- routine shadows;
- rounded dashboard cards;
- multiple equal red CTAs in one region;
- arbitrary hex colors when a semantic token exists;
- raw API or database messages in UI;
- icons without labels when the action is not universally understood;
- decorative gauges, 3D charts, neon, glow, glass, blur, or ambient animation;
- empty-state illustrations with no operational purpose.

## Registry maintenance

When introducing a new shared component, update this file with:

- component name and file;
- status;
- purpose;
- interaction and responsive contract;
- routes or modules using it;
- migration notes when replacing an older pattern.

A component should become shared only when it appears in at least three views, carries a trust/accessibility/responsive contract, or prevents meaningful operational divergence.