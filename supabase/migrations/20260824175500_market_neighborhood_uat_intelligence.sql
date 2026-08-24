-- UAT intelligence for Pedro Pablo.
-- Keep the original neighborhood-review evidence immutable; store scoring separately.

create table if not exists public.market_neighborhood_review_assessments (
  review_item_id uuid primary key references public.market_neighborhood_review_items(id) on delete cascade,
  confidence_score integer not null check (confidence_score between 0 and 100),
  review_priority text not null check (review_priority in ('approve_recommended','quick_review','mandatory_review')),
  geometry_status text not null check (geometry_status in ('name_evidence_only','boundary_requires_coordinates','no_unambiguous_kml_match')),
  rationale text not null,
  methodology_version text not null default 'pp-uat-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_neighborhood_review_assessments enable row level security;
revoke all on public.market_neighborhood_review_assessments from anon;
grant select on public.market_neighborhood_review_assessments to authenticated;

drop policy if exists "neighborhood review assessments read leaders" on public.market_neighborhood_review_assessments;
create policy "neighborhood review assessments read leaders"
on public.market_neighborhood_review_assessments
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo')
  )
);

with scored(source_listing_id, confidence_score, review_priority, geometry_status, rationale) as (
  values
    ('4087925792',99,'approve_recommended','name_evidence_only','Dirección y título identifican Santa María de Manquehue.'),
    ('4335445638',99,'approve_recommended','name_evidence_only','Dirección y título identifican Club de Polo.'),
    ('2140673187',99,'approve_recommended','name_evidence_only','La dirección identifica La Llavería de forma explícita.'),
    ('4340796354',98,'approve_recommended','name_evidence_only','Dirección específica Alonso de Córdova 2313 y título consistente.'),
    ('4328817258',98,'approve_recommended','name_evidence_only','La dirección identifica Lo Curro.'),
    ('2061516525',98,'approve_recommended','name_evidence_only','La dirección identifica Santa María de Manquehue.'),
    ('4029202872',97,'approve_recommended','name_evidence_only','La dirección identifica Jardín del Este.'),
    ('1838428351',97,'approve_recommended','name_evidence_only','La dirección identifica Pío XI.'),
    ('4354065840',97,'approve_recommended','name_evidence_only','La dirección identifica Tabancura.'),
    ('4313538294',96,'quick_review','name_evidence_only','La dirección identifica La Llavería.'),
    ('4329445598',96,'quick_review','name_evidence_only','Luis Pasteur aparece como referencia específica.'),
    ('2146478711',95,'quick_review','name_evidence_only','El Aromo aparece como referencia específica.'),
    ('4335438310',94,'quick_review','name_evidence_only','El título identifica Las Nieves; el portal usa una etiqueta territorial más amplia.'),
    ('2146541437',92,'mandatory_review','name_evidence_only','Nueva Costanera es específica, pero Parque Bicentenario también aparece como contexto.'),
    ('2147886509',91,'mandatory_review','name_evidence_only','Sport Francés es específico, con La Llavería como contexto más amplio.'),
    ('4354065940',55,'mandatory_review','boundary_requires_coordinates','San Damián y Tabancura compiten; sin coordenadas no corresponde forzar un barrio KML.'),
    ('2149472381',55,'mandatory_review','boundary_requires_coordinates','Bicentenario y Alonso de Córdova compiten; sin coordenadas no corresponde forzar un barrio KML.'),
    ('3555694156',20,'mandatory_review','no_unambiguous_kml_match','Borde Río / Casa Piedra no entrega una correspondencia inequívoca.'),
    ('2160854915',20,'mandatory_review','no_unambiguous_kml_match','Borde Río / Escrivá de Balaguer no entrega una correspondencia inequívoca.'),
    ('4179311490',20,'mandatory_review','no_unambiguous_kml_match','Estadio Croata / Lo Gallo no tiene correspondencia inequívoca con el KML.'),
    ('2025076515',20,'mandatory_review','no_unambiguous_kml_match','El Clonqui / Kennedy / Los Laureles no permite una asignación inequívoca.')
)
insert into public.market_neighborhood_review_assessments (
  review_item_id, confidence_score, review_priority, geometry_status, rationale
)
select r.id, s.confidence_score, s.review_priority, s.geometry_status, s.rationale
from scored s
join public.market_neighborhood_review_items r
  on r.evidence->>'source_listing_id' = s.source_listing_id
on conflict (review_item_id) do update set
  confidence_score = excluded.confidence_score,
  review_priority = excluded.review_priority,
  geometry_status = excluded.geometry_status,
  rationale = excluded.rationale,
  methodology_version = 'pp-uat-v1',
  updated_at = now();

create or replace function public.market_neighborhood_uat_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select lower(coalesce(p.role,'')) into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role not in ('admin','ceo') then raise exception 'Insufficient permissions'; end if;

  select jsonb_build_object(
    'known_addresses', (select count(*) from private.market_address_resolution_memory),
    'learned_from_reviews', (select count(*) from private.market_address_resolution_memory where source_kind='human_review'),
    'reuse_hits', (select coalesce(sum(hit_count),0) from private.market_address_resolution_memory),
    'clear_pending', (select count(*) from public.market_neighborhood_review_items where classification='clear' and decision='pending'),
    'approve_recommended', (select count(*) from public.market_neighborhood_review_assessments a join public.market_neighborhood_review_items r on r.id=a.review_item_id where r.decision='pending' and a.review_priority='approve_recommended'),
    'quick_review', (select count(*) from public.market_neighborhood_review_assessments a join public.market_neighborhood_review_items r on r.id=a.review_item_id where r.decision='pending' and a.review_priority='quick_review'),
    'mandatory_review', (select count(*) from public.market_neighborhood_review_assessments a join public.market_neighborhood_review_items r on r.id=a.review_item_id where r.decision='pending' and a.review_priority='mandatory_review'),
    'ambiguous', (select count(*) from public.market_neighborhood_review_items where classification='ambiguous' and decision='pending'),
    'no_match', (select count(*) from public.market_neighborhood_review_items where classification='no_match' and decision='pending'),
    'reviewed', (select count(*) from public.market_neighborhood_review_items where decision<>'pending')
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.market_neighborhood_uat_snapshot() from public, anon;
grant execute on function public.market_neighborhood_uat_snapshot() to authenticated;
