-- Promote the already-audited 2025 monthly CRM baseline to the canonical metric layer.
-- This migration does not invent 2025 data. It mirrors:
--   data/crm-intelligence.json#baseline2025.months
--   data/management-baseline-2025-events.json
-- Source contracts and SHA-256 checks live in data/management-source-contracts-2025.json.
--
-- Scope: Property Partners Vitacura · Venta · Casa/Departamento · Vitacura.
-- Semantics: operational CRM facts only. These rows do NOT become Pedro management-credit metrics.

begin;

with company as (
  select id
  from public.management_entities
  where entity_type='company' and name='Property Partners Vitacura'
  limit 1
),
baseline(period_start,period_end,metric_code,value,source_file,source_sha256) as (
  values
  ('2025-01-01'::date,'2025-01-31'::date,'sales',2,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-01-01'::date,'2025-01-31'::date,'sales_uf',22790,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-01-01'::date,'2025-01-31'::date,'leads',348,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-01-01'::date,'2025-01-31'::date,'requirements',262,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-01-01'::date,'2025-01-31'::date,'scheduled_visits',330,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-01-01'::date,'2025-01-31'::date,'realized_visits',191,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-02-01'::date,'2025-02-28'::date,'sales',4,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-02-01'::date,'2025-02-28'::date,'sales_uf',61400,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-02-01'::date,'2025-02-28'::date,'leads',313,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-02-01'::date,'2025-02-28'::date,'requirements',226,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-02-01'::date,'2025-02-28'::date,'scheduled_visits',191,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-02-01'::date,'2025-02-28'::date,'realized_visits',115,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-03-01'::date,'2025-03-31'::date,'sales',4,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-03-01'::date,'2025-03-31'::date,'sales_uf',40600,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-03-01'::date,'2025-03-31'::date,'leads',390,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-03-01'::date,'2025-03-31'::date,'requirements',243,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-03-01'::date,'2025-03-31'::date,'scheduled_visits',358,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-03-01'::date,'2025-03-31'::date,'realized_visits',215,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-04-01'::date,'2025-04-30'::date,'sales',10,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-04-01'::date,'2025-04-30'::date,'sales_uf',119330,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-04-01'::date,'2025-04-30'::date,'leads',261,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-04-01'::date,'2025-04-30'::date,'requirements',228,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-04-01'::date,'2025-04-30'::date,'scheduled_visits',275,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-04-01'::date,'2025-04-30'::date,'realized_visits',175,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-05-01'::date,'2025-05-31'::date,'sales',4,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-05-01'::date,'2025-05-31'::date,'sales_uf',70350,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-05-01'::date,'2025-05-31'::date,'leads',352,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-05-01'::date,'2025-05-31'::date,'requirements',389,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-05-01'::date,'2025-05-31'::date,'scheduled_visits',260,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-05-01'::date,'2025-05-31'::date,'realized_visits',160,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-06-01'::date,'2025-06-30'::date,'sales',6,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-06-01'::date,'2025-06-30'::date,'sales_uf',74350,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-06-01'::date,'2025-06-30'::date,'leads',429,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-06-01'::date,'2025-06-30'::date,'requirements',493,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-06-01'::date,'2025-06-30'::date,'scheduled_visits',299,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-06-01'::date,'2025-06-30'::date,'realized_visits',175,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-07-01'::date,'2025-07-31'::date,'sales',4,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-07-01'::date,'2025-07-31'::date,'sales_uf',71150,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-07-01'::date,'2025-07-31'::date,'leads',423,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-07-01'::date,'2025-07-31'::date,'requirements',546,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-07-01'::date,'2025-07-31'::date,'scheduled_visits',386,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-07-01'::date,'2025-07-31'::date,'realized_visits',239,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-08-01'::date,'2025-08-31'::date,'sales',5,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-08-01'::date,'2025-08-31'::date,'sales_uf',77450,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-08-01'::date,'2025-08-31'::date,'leads',410,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-08-01'::date,'2025-08-31'::date,'requirements',526,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-08-01'::date,'2025-08-31'::date,'scheduled_visits',359,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-08-01'::date,'2025-08-31'::date,'realized_visits',234,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-09-01'::date,'2025-09-30'::date,'sales',3,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-09-01'::date,'2025-09-30'::date,'sales_uf',56000,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-09-01'::date,'2025-09-30'::date,'leads',266,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-09-01'::date,'2025-09-30'::date,'requirements',419,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-09-01'::date,'2025-09-30'::date,'scheduled_visits',260,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-09-01'::date,'2025-09-30'::date,'realized_visits',167,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-10-01'::date,'2025-10-31'::date,'sales',6,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-10-01'::date,'2025-10-31'::date,'sales_uf',78300,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-10-01'::date,'2025-10-31'::date,'leads',294,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-10-01'::date,'2025-10-31'::date,'requirements',426,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-10-01'::date,'2025-10-31'::date,'scheduled_visits',344,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-10-01'::date,'2025-10-31'::date,'realized_visits',210,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-11-01'::date,'2025-11-30'::date,'sales',6,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-11-01'::date,'2025-11-30'::date,'sales_uf',141500,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-11-01'::date,'2025-11-30'::date,'leads',294,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-11-01'::date,'2025-11-30'::date,'requirements',427,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-11-01'::date,'2025-11-30'::date,'scheduled_visits',319,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-11-01'::date,'2025-11-30'::date,'realized_visits',216,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-12-01'::date,'2025-12-31'::date,'sales',7,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-12-01'::date,'2025-12-31'::date,'sales_uf',106750,'ventas_2025_vitacura_con_vendedor.xlsx','2a82646575c7ce6df201caf3d5b64d004f9215e78fda4085008e167d419a5051'),
  ('2025-12-01'::date,'2025-12-31'::date,'leads',243,'leads_2025.xlsx','fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82'),
  ('2025-12-01'::date,'2025-12-31'::date,'requirements',409,'requerimientos_por_propiedades_2025.xlsx','bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e'),
  ('2025-12-01'::date,'2025-12-31'::date,'scheduled_visits',238,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9'),
  ('2025-12-01'::date,'2025-12-31'::date,'realized_visits',155,'visitas_agendadas_2025.xlsx','7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9')
),
rows as (
  select c.id as entity_id,b.*
  from company c
  cross join baseline b
)
insert into public.management_metric_values (
  entity_id,metric_code,period_start,period_end,value,
  source_name,source_reference,source_cutoff_at,
  quality_status,evaluation_status,formula_version,evaluated_at,evidence,updated_at
)
select
  entity_id,metric_code,period_start,period_end,value,
  'CRM historical canonical extraction',
  'data/crm-intelligence.json#baseline2025.months',
  period_end::timestamptz + interval '23 hours 59 minutes 59 seconds',
  'verified','evaluable',1,now(),
  jsonb_build_object(
    'authority','2025 authoritative CRM source contract',
    'sourceFile',source_file,
    'sourceSha256',source_sha256,
    'scope','Vitacura · Venta · Casa/Departamento',
    'derivedBaseline','data/management-baseline-2025-events.json',
    'publicationRule','Monthly operational baseline for YoY/YTD; never substitute Pedro management-credit metrics.'
  ),
  now()
from rows
on conflict (entity_id,metric_code,period_start,period_end,source_name)
do update set
  value=excluded.value,
  source_reference=excluded.source_reference,
  source_cutoff_at=excluded.source_cutoff_at,
  quality_status='verified',
  evaluation_status='evaluable',
  formula_version=1,
  evaluated_at=now(),
  evidence=excluded.evidence,
  updated_at=now();

commit;
