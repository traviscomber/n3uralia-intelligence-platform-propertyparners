# 2025 CRM Baseline — Canonical Evidence Map

## Scope

Property Partners Vitacura · Venta · Casa/Departamento · Vitacura.

This baseline is operational CRM evidence. It is not the Pedro management-credit layer introduced by the August 2026 board report.

## Authoritative source contracts

- Leads: `Datos 2025/raw/leads_2025.xlsx`
  - SHA-256 `fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82`
  - 4,023 canonical rows.
- Requerimientos: `Datos 2025/raw/requerimientos_por_propiedades_2025.xlsx`
  - SHA-256 `bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e`
  - 4,594 canonical rows.
- Visitas: `Datos 2025/raw/visitas_agendadas_2025.xlsx`
  - SHA-256 `7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9`
  - 3,619 unique scheduled visits.
  - 2,252 realized visits.
- Ventas: `Datos 2025/raw/ventas_2025_vitacura_con_vendedor.xlsx`
  - SHA-256 `2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051`
  - 61 canonical closings.
  - 919,970 UF.
- Sales reconciliation: `Datos 2025/raw/resumen_ventas_2025_vitacura.xlsx`
  - SHA-256 `9664ad6a277bb3cf74bc7bf6017f02a568f9147b717d51eed78ed9561866f790`
  - reconciliation only; never replaces the authoritative sales source.
- Captations annual context: `Datos 2025/raw/captaciones_vigentes_y_vendidas_dic_2025.xlsx`
  - SHA-256 `b5569d3d078f3c6e14a52f2ee349c370f7d3edaf15388fa99c9828c1ff01a53d`
  - 215 accepted context rows.
- Suspended annual context: `Datos 2025/raw/propiedades_suspendidas_2025.xlsx`
  - SHA-256 `6ce7af60aa6b36ba31bc52495e84606c4ae57f22048dc02c2f8920c52245cd9a`
  - 117 accepted context rows.
- Year-end stock annual context: `Datos 2025/raw/total_cartera_cierre_2025.xlsx`
  - SHA-256 `b95fe00313b734c2b8e21046604c5ffe448992228d710cc6788347cd312453d8`
  - 347 accepted published-stock rows after dedupe/exclusion.

## Monthly operational baseline

| Month | Sales | Sales UF | Leads | Requirements | Scheduled | Realized |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Jan | 2 | 22,790 | 348 | 262 | 330 | 191 |
| Feb | 4 | 61,400 | 313 | 226 | 191 | 115 |
| Mar | 4 | 40,600 | 390 | 243 | 358 | 215 |
| Apr | 10 | 119,330 | 261 | 228 | 275 | 175 |
| May | 4 | 70,350 | 352 | 389 | 260 | 160 |
| Jun | 6 | 74,350 | 429 | 493 | 299 | 175 |
| Jul | 4 | 71,150 | 423 | 546 | 386 | 239 |
| Aug | 5 | 77,450 | 410 | 526 | 359 | 234 |
| Sep | 3 | 56,000 | 266 | 419 | 260 | 167 |
| Oct | 6 | 78,300 | 294 | 426 | 344 | 210 |
| Nov | 6 | 141,500 | 294 | 427 | 319 | 216 |
| Dec | 7 | 106,750 | 243 | 409 | 238 | 155 |
| **2025** | **61** | **919,970** | **4,023** | **4,594** | **3,619** | **2,252** |

Monthly event baselines reconcile exactly to the annual canonical totals.

## Granular dimensions present in source files

The 2025 raw files contain more information than the original aggregate baseline:

- leads contain `Partner - Nombre`, `Sub-Sucursal - Nombre`, `Sucursal - Nombre`;
- requirements contain Partner and office fields;
- visits contain Partner, property agent, office and visit status;
- sales contain property agent and sale agent; the reconciliation workbook also contains property-agent office and sale-agent office.

Therefore office/partner historical reporting can be reconstructed from source evidence, but it must use an explicit identity/attribution mapping. Do not assign legacy names to current Partner entities by fuzzy name matching.

## Semantics for reporting

### Safe now

The canonical 2025 baseline supports company-level monthly YoY/YTD for:

- operational closings;
- operational UF;
- new leads;
- requirements;
- scheduled visits;
- realized visits.

### Context only

The annual context sources support year-end/annual context for:

- captures;
- suspended properties;
- stock.

They are not twelve monthly snapshots and must not be treated as such.

### Requires attribution contract

Office/Partner YoY is evidence-supported at raw-row level, but publication requires a stable mapping for:

- historical sub-sucursal codes/names;
- historical Partner names/aliases;
- listing agent vs sale agent;
- shared-operation credit.

Do not infer this mapping from current organization names.

## Relation to Pedro August 2026

The 2025 CRM baseline and Pedro's August board report are complementary:

- 2025 baseline = operational CRM history.
- Pedro August = management-credit / scoring authority.

Do not compute management-credit YoY by directly comparing Pedro's fractional credits to operational CRM close counts unless the historical 50/50 credit attribution rule is explicitly applied and verified.

## Database promotion

Migration `20260924162000_promote_2025_monthly_crm_baseline.sql` promotes the 72 company-level monthly operational facts above into `management_metric_values` with:

- source `CRM historical canonical extraction`;
- formula version 1;
- verified/evaluable status;
- file-level SHA provenance.

This enables the report engine's existing prior-year lookup without changing business semantics.
