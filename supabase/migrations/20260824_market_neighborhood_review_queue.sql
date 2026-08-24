create table if not exists public.market_neighborhood_review_items (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  classification text not null check (classification in ('clear','ambiguous','no_match')),
  suggested_neighborhood_id uuid references public.market_neighborhoods(id) on delete restrict,
  candidate_neighborhoods jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  decision text not null default 'pending' check (decision in ('pending','accepted','discarded')),
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_neighborhood_review_clear_has_suggestion check (
    classification <> 'clear' or suggested_neighborhood_id is not null
  ),
  constraint market_neighborhood_review_unique_listing unique (listing_id)
);

create index if not exists market_neighborhood_review_items_queue_idx
  on public.market_neighborhood_review_items (classification, decision, created_at);

alter table public.market_neighborhood_review_items enable row level security;

drop policy if exists "market neighborhood review read admin" on public.market_neighborhood_review_items;
create policy "market neighborhood review read admin"
on public.market_neighborhood_review_items
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "market neighborhood review update admin" on public.market_neighborhood_review_items;
create policy "market neighborhood review update admin"
on public.market_neighborhood_review_items
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

with target as (
  select ml.id as listing_id, ml.source_listing_id
  from public.market_listings ml
  join public.market_sources ms on ms.id = ml.source_id
  where ms.code in (
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments'
  )
    and ml.created_at >= '2026-08-17'::timestamptz
    and ml.created_at < '2026-08-18'::timestamptz
    and ml.property_id is null
), classification(source_listing_id, classification, neighborhood_name, candidates, reason) as (
  values
    ('4340796354','clear','Alonso de Córdova','["Alonso de Córdova"]'::jsonb,'Dirección específica Alonso de Córdova 2313; la etiqueta Parque Bicentenario es contexto del portal.'),
    ('4354065840','clear','Tabancura','["Tabancura"]'::jsonb,'La dirección del aviso identifica Tabancura.'),
    ('4335445638','clear','Club de Polo','["Club de Polo"]'::jsonb,'La dirección y el título identifican Club de Polo.'),
    ('4029202872','clear','Jardín del Este','["Jardín del Este"]'::jsonb,'La dirección identifica Jardín del Este.'),
    ('2061516525','clear','Santa María','["Santa María"]'::jsonb,'La dirección identifica Santa María de Manquehue.'),
    ('1838428351','clear','Pio XI','["Pio XI"]'::jsonb,'La dirección identifica Pío XI.'),
    ('4313538294','clear','La Llavería','["La Llavería"]'::jsonb,'La dirección identifica La Llavería.'),
    ('4329445598','clear','Luis Pasteur','["Luis Pasteur"]'::jsonb,'La dirección incluye Luis Pasteur como referencia específica.'),
    ('2146478711','clear','El Aromo','["El Aromo"]'::jsonb,'La dirección incluye El Aromo.'),
    ('2140673187','clear','La Llavería','["La Llavería"]'::jsonb,'La dirección identifica La Llavería.'),
    ('2146541437','clear','Nueva Costanera','["Nueva Costanera"]'::jsonb,'Nueva Costanera es la referencia específica; Parque Bicentenario es contexto del portal.'),
    ('4087925792','clear','Santa María','["Santa María"]'::jsonb,'Dirección y título identifican Santa María de Manquehue.'),
    ('4335438310','clear','Las Nieves','["Las Nieves"]'::jsonb,'El título identifica explícitamente el sector Las Nieves; Parque Bicentenario es la etiqueta amplia del portal.'),
    ('2147886509','clear','Sport Frances','["Sport Frances"]'::jsonb,'Sport Francés es la referencia específica; La Llavería es contexto más amplio.'),
    ('4328817258','clear','Lo Curro','["Lo Curro"]'::jsonb,'La dirección identifica Lo Curro.'),
    ('2149472381','ambiguous',null,'["Bicentenario","Alonso de Córdova"]'::jsonb,'El aviso nombra Bicentenario y Alonso de Córdova sin una señal suficiente para elegir uno.'),
    ('4354065940','ambiguous',null,'["San Damián","Tabancura"]'::jsonb,'El aviso combina San Damián y Tabancura sin una señal suficiente para elegir uno.'),
    ('3555694156','no_match',null,'[]'::jsonb,'Borde Río / Casa Piedra no coincide de forma inequívoca con un barrio KML canónico.'),
    ('2160854915','no_match',null,'[]'::jsonb,'Borde Río / Escrivá de Balaguer no permite una asignación inequívoca al KML.'),
    ('4179311490','no_match',null,'[]'::jsonb,'Estadio Croata / Lo Gallo no tiene correspondencia inequívoca con los barrios KML disponibles.'),
    ('2025076515','no_match',null,'[]'::jsonb,'El Clonqui / Kennedy / Los Laureles no permite usar la etiqueta amplia Parque Bicentenario como asignación canónica.')
)
insert into public.market_neighborhood_review_items (
  listing_id,
  classification,
  suggested_neighborhood_id,
  candidate_neighborhoods,
  evidence
)
select
  t.listing_id,
  c.classification,
  mn.id,
  c.candidates,
  jsonb_build_object(
    'source_listing_id', c.source_listing_id,
    'method', 'human_review_candidate_v1',
    'reason', c.reason,
    'canonical_write', false,
    'source_cut', '2026-08-17'
  )
from classification c
join target t on t.source_listing_id = c.source_listing_id
left join public.market_neighborhoods mn on mn.name = c.neighborhood_name
on conflict (listing_id) do update set
  classification = excluded.classification,
  suggested_neighborhood_id = excluded.suggested_neighborhood_id,
  candidate_neighborhoods = excluded.candidate_neighborhoods,
  evidence = excluded.evidence,
  updated_at = now();
