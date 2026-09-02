# Property Partners Intelligence Platform

Enterprise operating platform for real-estate intelligence, property valuation and commercial management for Property Partners Vitacura.

**Powered by N3uralia.**

Production: `https://ppartnersgroup.app`

Current verified production baseline:

- branch: `main`;
- commit: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- Vercel deployment: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- deployment state: `READY`.

The product is built around one operating principle:

> **Evidence → Decision → Action → Traceability**

## Contractual core

The current delivery is organized around three interoperable pillars:

1. **Market Intelligence**
2. **Property Valuation**
3. **Commercial Management Control + Reporting**

Technical status as of 2 September 2026:

| Pillar | Technical status | Next gate |
|---|---|---|
| Market Intelligence | PASS | Client UAT |
| Property Valuation | PASS | End-to-end client UAT |
| Management Control + Reporting | PASS technical | UAT + client-owned business definitions |

Technical PASS does not mean contractual acceptance. Final acceptance still requires Property Partners UAT, training and a recorded acceptance outcome.

## Current market snapshot

Audit snapshot from 2 September 2026:

- 44 active Vitacura houses in the dedicated live source;
- 44/44 with canonical KML neighborhood resolution;
- 41/44 usable for built-area UF/m² calculation;
- 19 canonical Vitacura KML sectors exposed by the public estimator;
- sector-level public sample threshold met by Santa María 12, La Llavería 7 and Club de Polo 6.

These values are an audit snapshot, not hardcoded business constants.

## Public referential estimator

The public root `/` includes a production referential estimator for **houses for sale in Vitacura**.

It is a complementary feature, not the professional valuation workflow and not a contractual replacement for Pillar II.

Rules:

- sector estimate only when at least 5 usable observations exist;
- otherwise the UI clearly uses a Vitacura-wide reference;
- built UF/m² is derived from listing price UF / built area;
- bedrooms and bathrooms are optional refinements and cannot destroy an otherwise valid sample when attribute coverage is sparse;
- no personal information is requested;
- raw listings/comparables are not exposed by the public endpoint.

See `docs/PUBLIC_VALUATION_ESTIMATOR_DELIVERY.md`.

## Professional valuation

The authenticated valuation workflow remains separate from the public estimator.

It includes:

- canonical subject identification;
- minimum 3 human-selected traceable comparables;
- deterministic calculation and professional justification;
- Executive → Director review/return/correction/resubmission;
- CEO approval protected by MFA/AAL2;
- immutable/versioned evidence snapshots;
- issue/report generation from the exact approved snapshot;
- auditable history and decisions.

## Market intelligence

The market layer explicitly separates:

- active offer vs confirmed CBRS sales;
- observed listing vs canonical property identity;
- live operational review vs historical property↔property duplicate review;
- active listing counts vs observations usable for a specific calculation;
- missing data vs zero.

The system must not manufacture precision where evidence is insufficient.

## Management control and reporting

The technical platform supports scoped metrics, reconciliations, tasks, persisted report snapshots, PDF generation, delivery traceability, retries/idempotency and protected schedules.

Business definitions that remain client-owned — KPI dictionary, final targets, thresholds, rankings, reporting calendar and recipients — stay fail-closed until formally approved.

## Security model

Authorization is layered:

```text
UI visibility
    ↓
Server capability checks
    ↓
Role / office / self scope
    ↓
Supabase RLS
    ↓
Database constraints and audit trail
```

Hidden UI controls never replace server-side authorization.

Critical valuation approval/issuance operations remain role-restricted and MFA/AAL2 protected.

## Documentation

Start here:

`docs/README.md`

Canonical delivery documents:

- `ROADMAP.md` — current contractual closure roadmap;
- `docs/CONTRACTUAL_DELIVERY_PACKAGE.md` — delivery package;
- `docs/TECHNICAL_CLOSURE_RECORD.md` — technical release evidence;
- `docs/UAT_PROPERTY_PARTNERS.md` — client UAT plan;
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md` — final acceptance checklist;
- `docs/USER_MANUAL.md` — user guide;
- `docs/ADMIN_MANUAL.md` — technical administration;
- `docs/SECURITY_AUTHORIZATION_MODEL.md` — authorization model;
- `docs/VALUATION_CANONICAL_METHODOLOGY_V2.md` — professional valuation methodology.

Historical agent, ML, V2 and experimental roadmap documents remain useful for traceability but do not define the current contractual delivery unless referenced by the documentation canon.

## Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase / PostgreSQL
- Vercel
- MapLibre / Leaflet
- PDF / DOCX / XLSX generation
- Resend for authorized delivery workflows

## Release discipline

Material changes must preserve:

1. contractual CI;
2. N3uralia IP boundaries;
3. preview deployment health;
4. runtime review for affected flows;
5. role/auth regression coverage;
6. responsive/visual QA when UI changes;
7. exact release baseline identification;
8. documented rollback path.

The next business gate is the Property Partners UAT documented in `docs/UAT_PROPERTY_PARTNERS.md`.